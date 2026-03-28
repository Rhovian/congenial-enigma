export default function DerivPopup({ title, children, onClose }) {
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="popup-overlay" onClick={handleOverlayClick}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>
          &times;
        </button>
        <div className="popup-title">{title}</div>
        {children}
      </div>
    </div>
  );
}
