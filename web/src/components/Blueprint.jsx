/**
 * Every card, panel, and figure is a wireframe object: hairline frame, square
 * corners, transparent fill, and a registration mark in each corner
 * (design/UI-GUIDELINES.md). The four `<i class="corner">` children are
 * required by the stylesheet and are decorative, so they are hidden from
 * assistive technology.
 */
export function Blueprint({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`blueprint ${className}`.trim()} {...rest}>
      {children}
      <i className="corner tl" aria-hidden="true" />
      <i className="corner tr" aria-hidden="true" />
      <i className="corner bl" aria-hidden="true" />
      <i className="corner br" aria-hidden="true" />
    </Tag>
  );
}
