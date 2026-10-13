// 把 VS Code 的主题类（body 上的 vscode-light / vscode-dark / vscode-high-contrast…）同步成核心库的 data-mdmm-theme，
// 用户切换主题时 VS Code 会改 body 的 class。

export function syncTheme(): void {
  const apply = () => {
    const light = document.body.classList.contains("vscode-light") ||
      document.body.classList.contains("vscode-high-contrast-light");
    document.documentElement.dataset["mdmmTheme"] = light ? "light" : "dark";
  };
  apply();
  new MutationObserver(apply).observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
}
