using System.Collections.ObjectModel;
using VaultApp.Core;

namespace VaultApp.Pages
{
    [QueryProperty(nameof(VaultData), "VaultData")]
    [QueryProperty(nameof(Password), "Password")]
    [QueryProperty(nameof(VaultPath), "VaultPath")]
    public partial class MainPage : ContentPage
    {
        // This gives us a safe reference to the entries collection
        private ObservableCollection<VaultEntry> _entries => VaultData?.Entries;

        private VaultData _vaultData;
        public VaultData VaultData
        {
            get => _vaultData;
            set
            {
                _vaultData = value;

                // Shell injects this AFTER constructor and sometimes AFTER OnAppearing
                if (_vaultData != null && EntriesView != null)
                {
                    EntriesView.ItemsSource = _vaultData.Entries;
                }
            }
        }

        public string Password { get; set; }
        public string VaultPath { get; set; }

        public MainPage()
        {
            InitializeComponent();
            BindingContext = this;
        }

        // ------------------------------------------------------------
        // OnAppearing: only bind if Shell has already injected data
        // ------------------------------------------------------------
        protected override void OnAppearing()
        {
            base.OnAppearing();

            if (VaultData != null)
            {
                EntriesView.ItemsSource = VaultData.Entries;
            }
        }

        // ------------------------------------------------------------
        // Double-tap to enter edit mode
        // ------------------------------------------------------------
        private void OnEntryDoubleTapped(object sender, TappedEventArgs e)
        {
            if (sender is VisualElement ve && ve.BindingContext is VaultEntry entry)
            {
                entry.IsEditing = true;
                if (entry.Title == "New Entry")
                {
                    entry.Title = string.Empty;
                }
            }
        }

        // ------------------------------------------------------------
        // Save entry and exit edit mode
        // ------------------------------------------------------------
        private async void OnSaveEntry(object sender, EventArgs e)
        {
            var entry = (VaultEntry)((Button)sender).CommandParameter;

            entry.IsEditing = false;

            VaultService.SaveVault(VaultPath, Password, VaultData);

            await DisplayAlert("Saved", "Entry saved.", "OK");
        }

        // ------------------------------------------------------------
        // Add entry
        // ------------------------------------------------------------
        private void OnAddEntry(object sender, EventArgs e)
        {
            if (VaultData == null)
                return;

            VaultData.Entries.Add(new VaultEntry());
        }

        // ------------------------------------------------------------
        // Delete selected entry
        // ------------------------------------------------------------
        private async void OnDeleteEntry(object sender, EventArgs e)
        {
            if (EntriesView.SelectedItem is VaultEntry entry)
            {
                bool confirm = await DisplayAlert("Delete Entry",
                                                  "Are you sure?",
                                                  "Yes", "No");

                if (!confirm)
                    return;

                VaultData.Entries.Remove(entry);
                VaultService.SaveVault(VaultPath, Password, VaultData);
            }
            else
            {
                await DisplayAlert("No Selection", "Select an entry first.", "OK");
            }
        }

        // ------------------------------------------------------------
        // Track selected entry (custom highlight)
        // ------------------------------------------------------------
        private void OnEntrySelected(object sender, SelectionChangedEventArgs e)
        {
            if (_entries == null)
                return;

            // Clear previous selection
            foreach (var entry in _entries)
                entry.IsSelected = false;

            // Apply new selection
            if (e.CurrentSelection.FirstOrDefault() is VaultEntry selected)
                selected.IsSelected = true;
        }

        // ------------------------------------------------------------
        // Change password 
        // ------------------------------------------------------------
        private async void OnChangePassword(object sender, EventArgs e)
        {
            var dialog = new ChangePasswordDialog(VaultData, VaultPath, Password);
            await Navigation.PushModalAsync(dialog);

            // Wait for dialog to close
            dialog.Disappearing += (s, args) =>
            {
                if (dialog.ResultNewPassword != null)
                {
                    Password = dialog.ResultNewPassword;
                    DisplayAlert("Success", "Password changed.", "OK");
                }
            };
        }
    }
}
