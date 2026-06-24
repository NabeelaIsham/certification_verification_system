const BrandLogo = ({
  className = '',
  imageClassName = 'h-200 w-100',
  compact = false
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img
        src="\verifyawards-logo.png"
        alt="VerifyAwards"
        className={`${imageClassName} object-contain`}
      />
      {compact && (
        <span className="sr-only">VerifyAwards</span>
      )}
    </div>
  );
};

export default BrandLogo;
