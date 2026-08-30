namespace VaultApp.Core
{
    public static class VaultPaths
    {
        private const string VaultPathKey = "VaultPath";
        private const string DefaultVaultName = "vault.enc";

        public static string GetDefaultVaultPath()
        {
            if (Preferences.ContainsKey(VaultPathKey))
                return Preferences.Get(VaultPathKey, "");

            string path = Path.Combine(FileSystem.AppDataDirectory, DefaultVaultName);
            Preferences.Set(VaultPathKey, path);
            return path;
        }

        public static void SetDefaultVaultPath(string path)
        {
            Preferences.Set(VaultPathKey, path);
        }
    }
}

