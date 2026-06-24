import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: '#3B6FE8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 0,
        }}
      >
        {/* Person head circle */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '10px solid white',
            background: 'transparent',
            marginBottom: 8,
          }}
        />
        {/* Checkmark — drawn as two lines via rotated divs */}
        <div style={{ display: 'flex', position: 'relative', width: 72, height: 48 }}>
          {/* Short left stroke */}
          <div style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: 28,
            height: 10,
            background: 'white',
            borderRadius: 5,
            transform: 'rotate(-45deg)',
            transformOrigin: 'left bottom',
          }} />
          {/* Long right stroke */}
          <div style={{
            position: 'absolute',
            left: 16,
            bottom: 0,
            width: 52,
            height: 10,
            background: 'white',
            borderRadius: 5,
            transform: 'rotate(45deg)',
            transformOrigin: 'left bottom',
          }} />
        </div>
      </div>
    ),
    { ...size }
  )
}
