/* Enpovi platform ayarları.
   url / anon: Supabase → Project Settings → API Keys (publishable anahtar tarayıcıda kullanılmak üzere tasarlanmıştır; secret anahtarı ASLA buraya yazma).
   girisli: girişin zorunlu olduğu müşteri klasörleri. ["*"] = hepsi. Listede olmayan paneller eskisi gibi girişsiz açılır.
   Bir müşteriyi listeye eklemeden önce yönetim panelinden ona hesap açın, yoksa paneline giremez. */
window.ENPOVI_AYAR = {
  url: "https://fwiskbotrdpyavtodlfv.supabase.co",
  anon: "sb_publishable_PBb7z7vXx34Et5sa4f2mpg_HmgpAD-3",
  girisli: ["gesa-kemer-dunyasi"]
};
