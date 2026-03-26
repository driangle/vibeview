import { defineConfig } from "vitepress";

export default defineConfig({
  title: "vibeview",
  description:
    "Browse your AI coding assistant sessions in a clean, local web UI",
  base: "/vibeview/",
  head: [["link", { rel: "icon", href: "/vibeview/favicon.svg" }]],

  themeConfig: {
    logo: "/favicon.svg",
    nav: [
      { text: "Guide", link: "/getting-started/quick-start" },
      {
        text: "GitHub",
        link: "https://github.com/driangle/vibeview",
      },
    ],

    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Quick Start", link: "/getting-started/quick-start" },
          { text: "Installation", link: "/getting-started/installation" },
        ],
      },
      {
        text: "Guide",
        items: [
          { text: "CLI", link: "/guide/cli" },
          { text: "Web Interface", link: "/guide/web-interface" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/driangle/vibeview" },
    ],
  },
});
