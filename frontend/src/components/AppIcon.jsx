const AppIcon = ({ className = "", size = 36 }) => (
  <img
    src="/yora-icon.svg"
    alt=""
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    draggable={false}
  />
);

export default AppIcon;
