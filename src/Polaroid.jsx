
export function Polaroid({
  photo,
  className = '',
  onClick,
  footer = <div />,
}) {

  return (
    <div className={`inline-block w-full max-w-sm ${className}`}>
      <div
        className='p-4 sm:p-5 pb-15 sm:pb-20 rounded-sm bg-[linear-gradient(rgba(255,255,255,0.9),rgba(255,255,255,0.3)),url("https://i.imgur.com/fX4hFeu.jpg")] bg-size-[30%] shadow-[0_5px_10px_-4px_rgba(0,0,0,0.4),inset_0_0_6px_rgba(0,0,0,0.05)]'
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') onClick()
              }
            : undefined
        }
      >
        <div
          className="w-full aspect-square shadow-[inset_0_0_4px_rgba(0,0,0,1),inset_0_0_20px_rgba(0,0,0,0.3)] bg-cover bg-center"
          style={{
            backgroundImage: `url("${photo}")`,
          }}
        />
        {footer}
      </div>
    </div>
  )
}