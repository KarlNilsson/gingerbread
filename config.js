// URL of the proxy (Cloudflare Worker, or the local dev server).
// After deploying the worker, replace this with e.g.
// "https://gingerbread-forms-proxy.<your-subdomain>.workers.dev"
window.DASHBOARD_CONFIG = {
  dataUrl: "https://gingerbread-forms-proxy.meisterkarl-cloudflare.workers.dev",
  pollMs: 5000,
};
