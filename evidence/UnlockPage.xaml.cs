using VaultApp.Core;
using VaultApp.Services;

namespace VaultApp.Pages
{
    public partial class UnlockPage : ContentPage
    {
        public UnlockPage()
        {
            InitializeComponent();

            // Display the current vault path
            VaultPathLabel.Text = $"Vault: {VaultPaths.GetDefaultVaultPath()}";
        }

        // ------------------------------------------------------------
        // Unlock the vault
        // ------------------------------------------------------------
        private async void OnUnlockClicked(object sender, EventArgs e)
        {
            try
            {
                string password = PasswordEntry.Text;
                string path = VaultPaths.GetDefaultVaultPath();

                var data = VaultService.LoadVault(path, password);

                // Navigate to MainPage with absolute route
                await Shell.Current.GoToAsync("///main", new Dictionary<string, object>
                {
                    { "VaultData", data },
                    { "Password", password },
                    { "VaultPath", path }
                });
            }
            catch
            {
                await DisplayAlert("Error", "Incorrect password.", "OK");
            }
        }

        // ------------------------------------------------------------
        // Select a different vault file
        // ------------------------------------------------------------
        private async void OnOpenDifferentVault(object sender, EventArgs e)
        {
            var result = await FilePicker.Default.PickAsync(new PickOptions
            {
                PickerTitle = "Select Vault File"
            });

            if (result == null)
                return;

            string path = result.FullPath;

            VaultPaths.SetDefaultVaultPath(path);
            VaultPathLabel.Text = $"Vault: {path}";
            PasswordEntry.Text = string.Empty;
        }

        // ------------------------------------------------------------
        // Create a new vault file
        // ------------------------------------------------------------
        // ------------------------------------------------------------
        // Create a new vault file
        // ------------------------------------------------------------
        // ------------------------------------------------------------
        // Create a new vault file
        // ------------------------------------------------------------
        private async void OnCreateNewVault(object sender, EventArgs e)
        {
            // 1. Ask user where to create the vault
            var folder = await FolderPicker.PickFolderAsync();

            if (folder == null)
            {
                await DisplayAlert("Cancelled", "No folder selected.", "OK");
                return;
            }

            // 2. Build the vault file path
            string vaultPath = Path.Combine(folder, "vault.enc");

            // 3. Check if file already exists
            if (File.Exists(vaultPath))
            {
                bool overwrite = await DisplayAlert(
                    "File Already Exists",
                    "A vault named 'vault.enc' already exists in this folder.\n\nDo you want to overwrite it?",
                    "Overwrite",
                    "Cancel"
                );

                if (!overwrite)
                    return;
            }

            // 4. Create empty vault
            var vault = new VaultData();

            // 5. Save it (empty password allowed)
            VaultService.SaveVault(vaultPath, PasswordEntry.Text, vault);

            // 6. Update default vault path
            VaultPaths.SetDefaultVaultPath(vaultPath);
            VaultPathLabel.Text = $"Vault: {vaultPath}";

            // 7. Navigate to MainPage (absolute route required)
            await Shell.Current.GoToAsync("///main", new Dictionary<string, object>
    {
        { "VaultData", vault },
        { "Password", PasswordEntry.Text },
        { "VaultPath", vaultPath }
    });
        }


    }
}
