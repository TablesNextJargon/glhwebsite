import { useState } from 'react';

export default function YouTubeVideo({ videoId, title }) {
  const [isLoaded, setIsLoaded] = useState(false);

  if (isLoaded) {
    return (
      <div style={{
        position: 'relative',
        paddingBottom: '56.25%',
        height: 0,
        overflow: 'hidden',
        borderRadius: '4px',
        backgroundColor: '#000'
      }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={title}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 0
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="video-facade"
      aria-label={`Play ${title}`}
      style={{
        position: 'relative',
        height: 0,
        overflow: 'hidden',
        display: 'block',
        width: '100%',
        padding: 0,
        paddingBottom: '56.25%',
        border: 0,
        background: 'transparent',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
      onClick={() => setIsLoaded(true)}
    >
      <img
        src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
        alt=""
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.target.src = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />
      <span style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '68px',
        height: '48px',
        backgroundColor: '#ff0000',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}>
        <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </span>
    </button>
  );
}
