const BrandLogo = ({
  className = '',
  imageClassName = 'h-12 w-auto',
  compact = false
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="/certiverxia-logo.svg"
        alt="CERTIVERXIA"
        className={`${imageClassName} object-contain`}
      />
      {compact && (
        <span className="sr-only">CERTIVERXIA</span>
      )}
    </div>
  );
};

export default BrandLogo;
