using System;
using System.IO;
using System.Security.Cryptography;
using System.Text.Json;

namespace VaultApp.Core
{
    public static class VaultService
    {
        private const int SaltLength = 16;   // 128-bit
        private const int IvLength = 12;   // 96-bit (GCM recommended)
        private const int TagLength = 16;   // 128-bit auth tag
        private const int KeyLength = 32;   // 256-bit key
        private const int Iterations = 100_000;

        // ------------------------------------------------------------
        // Load vault
        // ------------------------------------------------------------
        public static VaultData LoadVault(string path, string password)
        {
            if (!File.Exists(path))
                return new VaultData();

            byte[] fileBytes = File.ReadAllBytes(path);

            if (fileBytes.Length < SaltLength + IvLength + TagLength)
                throw new InvalidDataException("Vault file is too short or corrupted.");

            // Layout: [salt][iv][ciphertext||tag]
            byte[] salt = new byte[SaltLength];
            byte[] iv = new byte[IvLength];

            Buffer.BlockCopy(fileBytes, 0, salt, 0, SaltLength);
            Buffer.BlockCopy(fileBytes, SaltLength, iv, 0, IvLength);

            int cipherPlusTagLength = fileBytes.Length - SaltLength - IvLength;
            byte[] cipherPlusTag = new byte[cipherPlusTagLength];
            Buffer.BlockCopy(fileBytes, SaltLength + IvLength, cipherPlusTag, 0, cipherPlusTagLength);

            if (cipherPlusTagLength < TagLength)
                throw new InvalidDataException("Vault file is corrupted (no tag).");

            int cipherLength = cipherPlusTagLength - TagLength;
            byte[] ciphertext = new byte[cipherLength];
            byte[] tag = new byte[TagLength];

            Buffer.BlockCopy(cipherPlusTag, 0, ciphertext, 0, cipherLength);
            Buffer.BlockCopy(cipherPlusTag, cipherLength, tag, 0, TagLength);

            byte[] key = DeriveKey(password, salt);

            byte[] plaintext;
            try
            {
                plaintext = Decrypt(ciphertext, tag, iv, key);
            }
            catch (CryptographicException)
            {
                throw new InvalidDataException("Invalid password or corrupted vault.");
            }

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            var data = JsonSerializer.Deserialize<VaultData>(plaintext, options);
            return data ?? new VaultData();
        }

        // ------------------------------------------------------------
        // Save vault
        // ------------------------------------------------------------
        public static void SaveVault(string path, string password, VaultData data)
        {
            if (data == null)
                data = new VaultData();

            byte[] plaintext = JsonSerializer.SerializeToUtf8Bytes(data);

            byte[] salt = RandomBytes(SaltLength);
            byte[] iv = RandomBytes(IvLength);
            byte[] key = DeriveKey(password, salt);

            byte[] ciphertext = new byte[plaintext.Length];
            byte[] tag = new byte[TagLength];

            using (var aesGcm = new AesGcm(key))
            {
                aesGcm.Encrypt(iv, plaintext, ciphertext, tag);
            }

            // Java format: [salt][iv][ciphertext||tag]
            byte[] cipherPlusTag = new byte[ciphertext.Length + tag.Length];
            Buffer.BlockCopy(ciphertext, 0, cipherPlusTag, 0, ciphertext.Length);
            Buffer.BlockCopy(tag, 0, cipherPlusTag, ciphertext.Length, tag.Length);

            byte[] output = new byte[SaltLength + IvLength + cipherPlusTag.Length];
            Buffer.BlockCopy(salt, 0, output, 0, SaltLength);
            Buffer.BlockCopy(iv, 0, output, SaltLength, IvLength);
            Buffer.BlockCopy(cipherPlusTag, 0, output, SaltLength + IvLength, cipherPlusTag.Length);

            File.WriteAllBytes(path, output);
        }

        // ------------------------------------------------------------
        // Helpers
        // ------------------------------------------------------------
        private static byte[] DeriveKey(string password, byte[] salt)
        {
            if (password == null)
                password = string.Empty;

            using var kdf = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithmName.SHA256);
            return kdf.GetBytes(KeyLength);
        }

        private static byte[] RandomBytes(int length)
        {
            byte[] bytes = new byte[length];
            RandomNumberGenerator.Fill(bytes);
            return bytes;
        }

        private static byte[] Decrypt(byte[] ciphertext, byte[] tag, byte[] iv, byte[] key)
        {
            byte[] plaintext = new byte[ciphertext.Length];

            using (var aesGcm = new AesGcm(key))
            {
                aesGcm.Decrypt(iv, ciphertext, tag, plaintext);
            }

            return plaintext;
        }
    }
}


