import installationView from "@assets/OIP_(3)_1790360733658.webp";
import rooftopInstallation from "@assets/installation-solaire-1_1790360733713.png";
import solarFarm from "@assets/panneaux-solaire-energie-champs_1790360733753.jpg";
import solarPanelsAtSunset from "@assets/energie-solaire-25_1790360733788.jpg";
import solarHome from "@assets/OIP_1790360733823.webp";

export const solarImages = [
  { src: installationView, alt: "Installation de panneaux solaires" },
  { src: rooftopInstallation, alt: "Techniciens installant des panneaux solaires sur un toit" },
  { src: solarFarm, alt: "Champ équipé de panneaux solaires" },
  { src: solarPanelsAtSunset, alt: "Panneaux solaires au coucher du soleil" },
  { src: solarHome, alt: "Maison équipée de panneaux solaires" },
] as const;