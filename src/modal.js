/** A single modal owns focus and makes the rest of the panel inert. */
export function Modal({ className, style, label, onClose, children }) {
  const ref = React.useRef(null);
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const previous = document.activeElement;
    const parent = node.parentElement;
    const siblings = [...parent.children].filter((item) => item !== node);
    const inertBefore = siblings.map((item) => item.inert);
    siblings.forEach((item) => { item.inert = true; });
    const buttons = () => [...node.querySelectorAll('button:not([disabled]), [tabindex="0"]')];
    (buttons()[0] || node).focus();
    const trap = (event) => {
      if (event.key === 'Escape' && closeRef.current) {
        event.preventDefault(); closeRef.current(); return;
      }
      if (event.key !== 'Tab') return;
      const items = buttons();
      if (!items.length) { event.preventDefault(); node.focus(); return; }
      const current = items.indexOf(document.activeElement);
      if (current < 0 || (!event.shiftKey && current === items.length - 1) || (event.shiftKey && current === 0)) {
        event.preventDefault();
        items[event.shiftKey ? items.length - 1 : 0].focus();
      }
    };
    node.addEventListener('keydown', trap);
    return () => {
      node.removeEventListener('keydown', trap);
      siblings.forEach((item, i) => { item.inert = inertBefore[i]; });
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus();
      else parent?.querySelector('button:not([disabled])')?.focus();
    };
  }, []);
  return React.createElement('div', {
    ref, className, style, role: 'dialog', 'aria-modal': true, 'aria-label': label, tabIndex: -1,
  }, children);
}
