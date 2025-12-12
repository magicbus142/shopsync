import React from 'react'
import Lottie from 'lottie-react'
import animationData from '../../assets/Tracker Dashboard.json'

export default function HeroAnimation() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Lottie 
        animationData={animationData} 
        loop={true}
        className="max-w-full max-h-full drop-shadow-2xl" 
      />
    </div>
  )
}
