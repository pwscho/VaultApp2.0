using VaultApp.Core;

namespace VaultApp.Pages;

public partial class ChangePasswordDialog : ContentPage
{
    private readonly VaultData _vaultData;
    private readonly string _vaultPath;
    private readonly string _currentPassword;

    public string ResultNewPassword { get; private set; } = null;

    public ChangePasswordDialog(VaultData data, string vaultPath, string currentPassword)
    {
        InitializeComponent();
        _vaultData = data;
        _vaultPath = vaultPath;
        _currentPassword = currentPassword;
    }

    private async void OnCancel(object sender, EventArgs e)
    {
        ResultNewPassword = null;
        await Navigation.PopModalAsync();
    }

    private async void OnSave(object sender, EventArgs e)
    {
        string current = CurrentPasswordEntry.Text ?? "";
        string newPass = NewPasswordEntry.Text ?? "";
        string confirm = ConfirmPasswordEntry.Text ?? "";

        // Validate current password
        if (!string.IsNullOrEmpty(_currentPassword))
        {
            if (current != _currentPassword)
            {
                await DisplayAlert("Error", "Current password is incorrect.", "OK");
                return;
            }
        }

        // Validate new password
        if (string.IsNullOrWhiteSpace(newPass))
        {
            await DisplayAlert("Error", "New password cannot be empty.", "OK");
            return;
        }

        if (newPass != confirm)
        {
            await DisplayAlert("Error", "New passwords do not match.", "OK");
            return;
        }

        // Save vault with new password
        VaultService.SaveVault(_vaultPath, newPass, _vaultData);

        ResultNewPassword = newPass;
        await Navigation.PopModalAsync();
    }
}
