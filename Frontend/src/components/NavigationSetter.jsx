import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { setNavigator } from '../utils/errorNavigation'

// This component lives inside RouterProvider so it has access to useNavigate
// It registers the navigate fn into the singleton so api.js can use it
export function NavigationSetter() {
  const navigate = useNavigate()
  useEffect(() => {
    setNavigator(navigate)
  }, [navigate])
  return null
}

export default NavigationSetter
