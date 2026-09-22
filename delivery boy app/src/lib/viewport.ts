export function installRiderViewport() {
 const update = () => {
  const v = window.visualViewport;
  document.documentElement.style.setProperty('--rider-visible-height', (v?.height || window.innerHeight) + 'px');
  document.documentElement.style.setProperty('--rider-visible-top', (v?.offsetTop || 0) + 'px');
 };
 update();
 window.addEventListener('resize', update);
 window.visualViewport?.addEventListener('resize', update);
 window.visualViewport?.addEventListener('scroll', update);
 return () => {window.removeEventListener('resize', update);window.visualViewport?.removeEventListener('resize', update);window.visualViewport?.removeEventListener('scroll', update);};
}
