const BrandLogo = ({
  className = '',
  imageClassName = 'h-200 w-100',
  compact = false
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/certiverxia-logo.svg"
        alt="Certiverxia"
        className={`${imageClassName} object-contain`}
      />
      {compact && (
        <span className="sr-only">Certiverxia</span>
      )}
    </div>
  );
};

export default BrandLogo;
