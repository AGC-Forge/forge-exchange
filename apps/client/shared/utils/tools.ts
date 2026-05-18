export interface CheckerTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  badgeColor?: string;
  category: "proxy-checker" | "antidetect-checker";
  color: string;
  status: "active" | "inactive";
  url: string;
}
export const CHECKER_TOOLS_CATALOG: CheckerTool[] = [
  {
    id: "proxy-checker",
    name: "Proxy Checker",
    description: "Check the validity of a proxy",
    icon: "material-symbols:vpn-googleone",
    badgeColor: "green",
    category: "proxy-checker",
    color: "green",
    status: "active",
    url: "/app/tools/proxy-checker",
  },
  {
    id: "antidetect-checker",
    name: "Antidetect Checker",
    description: "Check the validity of a proxy",
    icon: "ooui:user-anonymous",
    badgeColor: "violet",
    category: "antidetect-checker",
    color: "violet",
    status: "inactive",
    url: "/app/tools/antidetect-checker",
  }
]
