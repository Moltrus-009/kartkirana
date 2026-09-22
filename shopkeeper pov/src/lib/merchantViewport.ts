/** Keep dialogs within the visible area when the Android keyboard opens. */
export function installMerchantViewport() {
  const root = document.documentElement;
  const update = () => {
    const viewport = window.visualViewport;
    root.style.setProperty('--merchant-visible-height', `${viewport?.height || window.innerHeight}px`);
    root.style.setProperty('--merchant-visible-top', `${viewport?.offsetTop || 0}px`);
  };
  update();
  window.addEventListener('resize', update);
  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
  return () => {
    window.removeEventListener('resize', update);
    window.visualViewport?.removeEventListener('resize', update);
    window.visualViewport?.removeEventListener('scroll', update);
  };
}
