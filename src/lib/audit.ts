export type Severity = "critical" | "high" | "medium" | "low"

export type Finding = {
  id: string
  title: string
  severity: Severity
  cwe: string
  location: string
  summary: string
  impact: string
  evidence: string
  remediation: string
}

export type Strength = {
  title: string
  detail: string
}

export const auditMeta = {
  product: "VaultApp",
  repo: "https://github.com/pwscho/VaultApp",
  commit: "233e89689f2a2423dcfe1b5f8b5679bd977ea89a",
  commitDate: "13 March 2026",
  stack: ".NET MAUI (net10.0) — Windows, Android, iOS, Mac Catalyst",
  reviewedOn: "30 August 2026",
  method: "Source-assisted static review of the published tree. No dynamic instrumentation, no password-cracking runs, and no exploit proofs of concept.",
  overallRisk: "High",
  overallSummary:
    "The vault file format uses real authenticated encryption, but the product around it treats the master password as optional, shows every secret in cleartext, and never locks the session. That combination is not safe for real credentials.",
}

export const findings: Finding[] = [
  {
    id: "C-01",
    title: "Empty master password is accepted when creating a vault",
    severity: "critical",
    cwe: "CWE-521 — Weak Password Requirements",
    location: "Pages/UnlockPage.xaml.cs, VaultService.DeriveKey",
    summary:
      "Create New Vault writes vault.enc using whatever is in the password field, including nothing. DeriveKey also substitutes null with an empty string, so an empty password is a first-class key.",
    impact:
      "Anyone who can read the file can decrypt it. There is no secret. This is the fastest way to lose the vault if it is synced, backed up, or left in a shared folder.",
    evidence: `// UnlockPage.xaml.cs — Create New Vault
// 5. Save it (empty password allowed)
VaultService.SaveVault(vaultPath, PasswordEntry.Text, vault);

// VaultService.cs
private static byte[] DeriveKey(string password, byte[] salt)
{
    if (password == null)
        password = string.Empty;
    using var kdf = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithmName.SHA256);
    return kdf.GetBytes(KeyLength);
}`,
    remediation:
      "Refuse empty and whitespace-only passwords on create, unlock, and change-password. Require a confirmation field on create. Reject the current password if it is empty when the user later tries to change it. Do not coerce null to empty inside the KDF.",
  },
  {
    id: "C-02",
    title: "Every stored password is shown in cleartext in the list",
    severity: "critical",
    cwe: "CWE-319 — Cleartext Transmission / Display of Sensitive Information",
    location: "Pages/MainPage.xaml",
    summary:
      "The collection view binds the Password field to a Label in display mode. Opening the vault reveals every secret at once. Edit mode uses a plain Entry, so the value stays visible while typing.",
    impact:
      "Shoulder surfing, screenshots, screen recordings, screen sharing, and accessibility services can read the entire vault. This undoes most of the value of encrypting the file at rest.",
    evidence: `<!-- display mode -->
<Label Text="{Binding Password}"
       FontSize="12"
       Grid.Column="2"
       VerticalOptions="Center"
       IsVisible="{Binding IsEditing, Converter={StaticResource InverseBoolConverter}}" />

<!-- edit mode: IsPassword is not set -->
<Entry Text="{Binding Password}"
       FontSize="12"
       Grid.Column="2"
       VerticalOptions="Center"
       IsVisible="{Binding IsEditing}" />`,
    remediation:
      "Mask secrets by default (••••••••). Reveal one field at a time behind an explicit reveal control that auto-hides. Set IsPassword on the edit Entry. Prefer a copy-to-clipboard action with a short clipboard lifetime instead of leaving the value on screen.",
  },
  {
    id: "H-01",
    title: "PBKDF2 iteration count is below current guidance",
    severity: "high",
    cwe: "CWE-916 — Password Hash With Insufficient Computational Effort",
    location: "Core/VaultService.cs",
    summary:
      "The KDF is PBKDF2-HMAC-SHA256 with 100,000 iterations. That was a common default a decade ago. Current OWASP guidance for PBKDF2-SHA256 is 600,000 iterations. The vault file is a portable offline target.",
    impact:
      "A stolen vault.enc can be guessed far cheaper than it should be. Combined with empty or short passwords, offline recovery is realistic. There is no file-format version field, so raising the count later needs a migration path.",
    evidence: `private const int Iterations = 100_000;

using var kdf = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithmName.SHA256);`,
    remediation:
      "Move to 600,000+ PBKDF2-SHA256 iterations or, better, Argon2id with a memory cost. Add a version byte (or AAD) so old files can be upgraded on the next successful unlock. Never lower the count for existing files without a re-encrypt.",
  },
  {
    id: "H-02",
    title: "Master password and decrypted vault travel through Shell navigation",
    severity: "high",
    cwe: "CWE-312 — Cleartext Storage of Sensitive Information",
    location: "Pages/UnlockPage.xaml.cs, Pages/MainPage.xaml.cs",
    summary:
      "Unlock passes VaultData, Password, and VaultPath as Shell query properties. MainPage stores the master password on a public string property for the rest of the session.",
    impact:
      "The master password lives as a managed string (immutable, not wipeable) and may appear in navigation state. A memory dump, crash dump, or a later page that logs query properties can recover it. The decrypted entry list stays resident with no lock.",
    evidence: `await Shell.Current.GoToAsync("///main", new Dictionary<string, object>
{
    { "VaultData", data },
    { "Password", password },
    { "VaultPath", path }
});

[QueryProperty(nameof(Password), "Password")]
public string Password { get; set; }`,
    remediation:
      "Hold the derived key in a short-lived session service, not the password string. Do not pass secrets through navigation dictionaries. Zero key material after each save. Lock and drop the session when the app backgrounds.",
  },
  {
    id: "H-03",
    title: "No auto-lock, idle timeout, or lock-on-background",
    severity: "high",
    cwe: "CWE-613 — Insufficient Session Expiration",
    location: "App.xaml.cs, Pages/MainPage.xaml.cs",
    summary:
      "After a successful unlock the vault stays open until the process exits. There is no idle timer, no lock when the window loses focus, and no Android/iOS lifecycle handler that returns to UnlockPage.",
    impact:
      "A laptop left unlocked, a phone left on the desk, or an app-switcher snapshot keeps every secret available. This is the usual way consumer vaults are actually compromised.",
    evidence: `public partial class App : Application
{
    public App()
    {
        InitializeComponent();
        // no lifecycle lock
    }
}`,
    remediation:
      "Lock after a short idle period (1–5 minutes) and whenever the app backgrounds. Clear VaultData and the session key on lock. Require the master password again. Hide the window contents in the app switcher.",
  },
  {
    id: "H-04",
    title: "No screenshot or recent-apps protection",
    severity: "high",
    cwe: "CWE-200 — Exposure of Sensitive Information",
    location: "Platforms/Android/MainActivity.cs, Platforms/iOS/Info.plist, MainPage.xaml",
    summary:
      "Android never sets FLAG_SECURE. iOS has no privacy screenshot / overlay for the app switcher. Combined with C-02, the OS will snapshot a screen full of passwords.",
    impact:
      "Recent-apps view, OS screenshots, and many screen recorders will capture the vault contents. Cloud screenshot sync then takes those images off-device.",
    evidence: `public class MainActivity : MauiAppCompatActivity
{
    // no Window.SetFlags(WindowManagerFlags.Secure, ...)
}`,
    remediation:
      "Set FLAG_SECURE on Android while the vault is unlocked. On iOS, obscure the window in DidEnterBackground. On Windows, consider excluding the window from capture APIs. Still mask the fields so a snapshot is useless.",
  },
  {
    id: "H-05",
    title: "Key and plaintext buffers are never wiped",
    severity: "high",
    cwe: "CWE-316 — Cleartext Storage of Sensitive Information in Memory",
    location: "Core/VaultService.cs",
    summary:
      "DeriveKey, Decrypt, and SaveVault allocate key, plaintext JSON, ciphertext, and tag arrays and then drop them for garbage collection. There is no CryptographicOperations.ZeroMemory (or Array.Clear) in a finally block.",
    impact:
      "Process memory, crash dumps, and some swap/hibernation images can retain the vault JSON and the 256-bit file key after the user thinks they locked the app.",
    evidence: `byte[] key = DeriveKey(password, salt);
plaintext = Decrypt(ciphertext, tag, iv, key);
var data = JsonSerializer.Deserialize<VaultData>(plaintext, options);

byte[] plaintext = JsonSerializer.SerializeToUtf8Bytes(data);
using (var aesGcm = new AesGcm(key))
{
    aesGcm.Encrypt(iv, plaintext, ciphertext, tag);
}`,
    remediation:
      "Wipe key, plaintext, and password byte buffers in finally blocks. Prefer Utf8 bytes over System.String for the password. Keep the decrypted model only while the session is unlocked.",
  },
  {
    id: "H-06",
    title: "Android backup is enabled for app data",
    severity: "high",
    cwe: "CWE-530 — Exposure of Backup File to an Unauthorized Control Sphere",
    location: "Platforms/Android/AndroidManifest.xml, Core/VaultPaths.cs",
    summary:
      "The default vault path is FileSystem.AppDataDirectory/vault.enc and the manifest sets android:allowBackup=\"true\". Auto Backup can copy the encrypted file (and Preferences that point at it) to cloud backup.",
    impact:
      "The vault file becomes an offline guessing target on a second device or in a backup archive. That is acceptable only if the password is strong and the KDF is expensive. This app currently allows neither.",
    evidence: `<application android:allowBackup="true" ...>
string path = Path.Combine(FileSystem.AppDataDirectory, DefaultVaultName);`,
    remediation:
      "Set allowBackup=\"false\" and disable data extraction for the vault file. If backup is a feature, it must be an explicit encrypted export the user starts, not OS Auto Backup.",
  },
  {
    id: "M-01",
    title: "Unused INTERNET permission on a local vault",
    severity: "medium",
    cwe: "CWE-250 — Execution with Unnecessary Privileges",
    location: "Platforms/Android/AndroidManifest.xml",
    summary:
      "The app requests INTERNET and ACCESS_NETWORK_STATE. No application code opens a network client. A password vault should not be able to talk to the network unless the user opted into a sync feature.",
    impact:
      "A compromised dependency or a later code change can exfiltrate the unlocked vault without an extra permission prompt. It also weakens the privacy story.",
    evidence: `<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.INTERNET" />`,
    remediation:
      "Remove both permissions until a real network feature exists. If you add sync later, gate it behind an explicit user action and keep vault plaintext off the wire.",
  },
  {
    id: "M-02",
    title: "No password policy or confirmation on vault create",
    severity: "medium",
    cwe: "CWE-521 — Weak Password Requirements",
    location: "Pages/UnlockPage.xaml.cs, Pages/ChangePasswordDialog.xaml.cs",
    summary:
      "Create New Vault never asks the user to type the password twice. Change Password rejects an empty new password but has no length or complexity check. Unlock has no confirmation that the user meant to use a short password.",
    impact:
      "Typos permanently lock a new vault, or users pick a three-character password and believe the AES label makes it safe.",
    evidence: `VaultService.SaveVault(vaultPath, PasswordEntry.Text, vault);

if (string.IsNullOrWhiteSpace(newPass))
{
    await DisplayAlert("Error", "New password cannot be empty.", "OK");
    return;
}`,
    remediation:
      "Require confirmation on create. Enforce a minimum length (at least 12) and a strength meter. Show a blocking warning for passwords that fail a zxcvbn-style check.",
  },
  {
    id: "M-03",
    title: "Change-password verifies the in-memory string, not the file",
    severity: "medium",
    cwe: "CWE-287 — Improper Authentication",
    location: "Pages/ChangePasswordDialog.xaml.cs",
    summary:
      "The dialog compares the typed current password to the string held on MainPage. If that string is empty, the check is skipped entirely. It never re-derives the key and decrypts vault.enc.",
    impact:
      "Anyone who reaches the unlocked UI (or a MainPage instance with a leftover empty password) can re-encrypt the vault under a password they choose, which is a lockout of the real owner.",
    evidence: `if (!string.IsNullOrEmpty(_currentPassword))
{
    if (current != _currentPassword)
    {
        await DisplayAlert("Error", "Current password is incorrect.", "OK");
        return;
    }
}
VaultService.SaveVault(_vaultPath, newPass, _vaultData);`,
    remediation:
      "Always re-open vault.enc with the typed current password before rewriting it. Use a fixed-time compare only as a UX shortcut, never as the source of truth. Never skip the check for an empty stored password.",
  },
  {
    id: "M-04",
    title: "Vault writes are not atomic",
    severity: "medium",
    cwe: "CWE-459 — Incomplete Cleanup",
    location: "Core/VaultService.SaveVault",
    summary:
      "SaveVault calls File.WriteAllBytes on the live path. A crash, kill, or full disk during the write leaves a truncated file. The previous ciphertext is already gone.",
    impact:
      "The user can lose the entire vault on a failed save. For a password manager this is a high-severity availability bug sitting next to the confidentiality bugs.",
    evidence: `File.WriteAllBytes(path, output);`,
    remediation:
      "Write to a temp file in the same directory, flush, then replace atomically (File.Replace / File.Move with overwrite). Keep one backup copy (vault.enc.bak) from the last good save.",
  },
  {
    id: "M-05",
    title: "File format has no version and GCM is constructed without an explicit tag size",
    severity: "medium",
    cwe: "CWE-330 — Use of Insufficiently Random Values (format agility)",
    location: "Core/VaultService.cs",
    summary:
      "On-disk layout is [salt 16][iv 12][ciphertext||tag 16] with no version or associated data. new AesGcm(key) is the obsolete constructor that does not take a tag size. Salt and IV are random, which is good, but they are not bound as AAD.",
    impact:
      "You cannot migrate KDF parameters safely. A truncated or swapped header is harder to diagnose. Future .NET versions warn on the obsolete constructor.",
    evidence: `using (var aesGcm = new AesGcm(key))
{
    aesGcm.Encrypt(iv, plaintext, ciphertext, tag);
}
// Java format: [salt][iv][ciphertext||tag]`,
    remediation:
      "Prefix a version byte. Pass that version (and the salt) as GCM AAD. Use new AesGcm(key, TagLength). Document the format so a second implementation cannot silently disagree on tag placement.",
  },
  {
    id: "M-06",
    title: "MainPage is a first-class Shell route next to Unlock",
    severity: "medium",
    cwe: "CWE-425 — Direct Request ('Forced Browsing')",
    location: "AppShell.xaml",
    summary:
      "Both unlock and main are sibling ShellContent routes. MainPage can be constructed without going through a successful LoadVault. Combined with empty-password create and in-memory password state, this is a brittle gate.",
    impact:
      "Navigation bugs, deep links, or a later flyout can present an empty or stale vault UI. It is not a remote bypass, but it is the wrong shape for a lock screen.",
    evidence: `<ShellContent Route="unlock" ContentTemplate="{DataTemplate pages:UnlockPage}" />
<ShellContent Route="main" ContentTemplate="{DataTemplate pages:MainPage}" />`,
    remediation:
      "Keep a single root. Push MainPage only after unlock succeeds. On lock, pop back to Unlock and drop the MainPage instance. Guard OnAppearing: if there is no session, navigate to unlock.",
  },
  {
    id: "M-07",
    title: "Create New Vault can overwrite vault.enc without opening it",
    severity: "medium",
    cwe: "CWE-706 — Use of Incorrectly-Resolved Name or Reference",
    location: "Pages/UnlockPage.xaml.cs",
    summary:
      "If the chosen folder already contains vault.enc, a confirm dialog offers Overwrite. The old file is replaced with an empty vault under the password currently in the unlock field. The old password is never checked.",
    impact:
      "A mistaken overwrite destroys the previous ciphertext with no recovery copy. This is an integrity / availability failure, not a confidentiality one.",
    evidence: `if (File.Exists(vaultPath))
{
    bool overwrite = await DisplayAlert(
        "File Already Exists",
        "A vault named 'vault.enc' already exists in this folder.\\n\\nDo you want to overwrite it?",
        "Overwrite",
        "Cancel");
}`,
    remediation:
      "Default to a unique filename. If overwrite is allowed, require the current password and keep vault.enc.bak. Never overwrite from the unlock screen using an empty password.",
  },
  {
    id: "L-01",
    title: "Unlock treats every failure as a wrong password",
    severity: "low",
    cwe: "CWE-209 — Generation of Error Message Containing Sensitive Information",
    location: "Pages/UnlockPage.xaml.cs",
    summary:
      "OnUnlockClicked catches Exception and always shows “Incorrect password.” File-not-found is actually handled inside LoadVault by returning an empty VaultData — so a missing file unlocks as a blank vault under whatever was typed.",
    impact:
      "Users can “unlock” a path that does not exist and then save, silently creating a new vault. Real I/O errors look like a bad password.",
    evidence: `if (!File.Exists(path))
    return new VaultData();

catch
{
    await DisplayAlert("Error", "Incorrect password.", "OK");
}`,
    remediation:
      "If the file is missing, say so and offer Create. Distinguish corruption (GCM tag fail after a successful read) from I/O errors. Do not create a vault as a side effect of Unlock.",
  },
  {
    id: "L-02",
    title: "Password compare on change is not constant-time",
    severity: "low",
    cwe: "CWE-208 — Observable Timing Discrepancy",
    location: "Pages/ChangePasswordDialog.xaml.cs",
    summary:
      "current != _currentPassword is a standard managed string compare. For a local desktop app this is a minor issue; the real check should be a decrypt of the file anyway (M-03).",
    impact:
      "Theoretical local side channel only. Not the priority.",
    evidence: `if (current != _currentPassword)`,
    remediation:
      "Re-decrypt the file. If you keep a string compare for UX, use CryptographicOperations.FixedTimeEquals on UTF-8 bytes.",
  },
  {
    id: "L-03",
    title: "Default template identity and full-trust Windows package",
    severity: "low",
    cwe: "CWE-1188 — Initialization of a Resource with an Insecure Default",
    location: "VaultApp.csproj, Platforms/Windows/Package.appxmanifest",
    summary:
      "ApplicationId is still com.companyname.vaultapp. The Windows package identity is the MAUI placeholder and requests runFullTrust. WindowsPackageType is None (unpackaged).",
    impact:
      "No sandbox, no meaningful publisher identity, easier to sideload a trojan with the same display name.",
    evidence: `<ApplicationId>com.companyname.vaultapp</ApplicationId>
<rescap:Capability Name="runFullTrust" />`,
    remediation:
      "Set a real application id and publisher. If you ship via Store, use a packaged identity. Unpackaged full-trust is acceptable for a personal tool, but do not pretend it is sandboxed.",
  },
  {
    id: "L-04",
    title: "UI flags are serialized into the encrypted JSON",
    severity: "low",
    cwe: "CWE-212 — Improper Removal of Sensitive Information Before Storage",
    location: "Core/VaultEntry.cs, Core/VaultService.SaveVault",
    summary:
      "System.Text.Json serializes every public property, including IsEditing and IsSelected. Those flags are not secrets, but they bloat the plaintext and can surprise a future schema.",
    impact:
      "Low. A vault saved mid-edit will reopen in edit mode with the password field visible (C-02).",
    evidence: `public bool IsEditing { get; set; }
public bool IsSelected { get; set; }
byte[] plaintext = JsonSerializer.SerializeToUtf8Bytes(data);`,
    remediation:
      "Use a dedicated storage DTO with [JsonIgnore] on UI-only properties, or JsonSerializerOptions that ignore them.",
  },
]

export const strengths: Strength[] = [
  {
    title: "AES-256-GCM with a 96-bit nonce and 128-bit tag",
    detail:
      "The file is not XOR, not AES-CBC without a MAC, and not a homemade cipher. GCM will refuse a wrong password or a truncated file instead of returning garbage.",
  },
  {
    title: "Fresh salt and IV on every save",
    detail:
      "RandomNumberGenerator.Fill supplies both. Saving the vault does not reuse a nonce under the same key.",
  },
  {
    title: "PBKDF2 uses SHA-256, not the old SHA-1 default",
    detail:
      "Rfc2898DeriveBytes is constructed with HashAlgorithmName.SHA256. The weak part is the iteration count, not the hash.",
  },
  {
    title: "Unlock and change-password fields are masked",
    detail:
      "IsPassword=\"True\" is set on the lock screen and the change-password dialog. The failure is the main list, not those two forms.",
  },
  {
    title: "No application-level telemetry or network client",
    detail:
      "Nothing in the C# sources opens HttpClient or logs vault contents. The INTERNET permission is unused template residue, not an active beacon.",
  },
  {
    title: "Wrong password fails closed",
    detail:
      "CryptographicException from GCM is mapped to InvalidDataException. The app does not decrypt-and-see.",
  },
]

export const threatModel = [
  {
    title: "Stolen vault.enc file",
    detail:
      "The intended threat. Strength depends entirely on the master password and the KDF. Empty passwords (C-01) and 100k PBKDF2 (H-01) make this threat real.",
  },
  {
    title: "Someone looking at the screen",
    detail:
      "Not defended. The main list prints every password (C-02) and the OS may snapshot it (H-04).",
  },
  {
    title: "Unlocked, unattended device",
    detail:
      "Not defended. There is no idle lock (H-03).",
  },
  {
    title: "Malware on the same account",
    detail:
      "Out of scope for a consumer file vault, and correctly so. A process with the user's rights can read vault.enc and wait for the password to be typed. Do not claim otherwise.",
  },
  {
    title: "Remote network attacker",
    detail:
      "No server, no sync, no account. This is the strongest part of the design. Keep it that way until there is a deliberate, encrypted sync feature.",
  },
]

export const remediationOrder = [
  "Block empty passwords on create, unlock, and change-password. Add a confirmation field on create.",
  "Mask secrets in the list. Reveal one value at a time. Copy-to-clipboard with a 15–30s clear.",
  "Raise PBKDF2 to at least 600,000 iterations (or switch to Argon2id) and add a file version for migration.",
  "Add idle auto-lock and lock-on-background. Drop the session key and VaultData when locked.",
  "Stop passing the master password through Shell query properties. Keep a session service instead.",
  "Wipe key and plaintext buffers after use. Write vault files atomically with a .bak.",
  "Disable Android Auto Backup. Remove unused INTERNET permissions.",
  "Set FLAG_SECURE / app-switcher cover. Never serialize IsEditing into the vault JSON.",
]

export function countBySeverity() {
  return {
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
    total: findings.length,
  }
}
