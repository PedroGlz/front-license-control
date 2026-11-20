export function licenseOwner(license: Record<string, any>): string {
  return license['Id_Customer']
    ? (license['Customer_Name'] || 'Sin cliente')
    : (license['User_Name'] || 'Sin usuario');
}
