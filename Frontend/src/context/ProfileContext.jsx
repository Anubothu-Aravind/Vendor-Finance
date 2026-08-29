import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'
import { useAuth } from '../hooks/AuthContext'

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const { user } = useAuth()
  const [companyProfile, setCompanyProfile] = useState(() => {
    try {
      const cached = localStorage.getItem('vastrams_cached_profile')
      if (cached) return JSON.parse(cached)
    } catch {}
    return {
      businessName: 'Vastrams',
      logo: '',
      ownerName: '',
      email: '',
      phone: '',
      address: '',
      gstin: '',
      website: '',
    }
  })
  const [loadingProfile, setLoadingProfile] = useState(true)

  const fetchCompanyProfile = useCallback(async () => {
    if (!user) {
      setLoadingProfile(false)
      return
    }
    try {
      const res = await api.get('/settings/profile')
      if (res.success && res.data) {
        const merged = {
          ...res.data,
          businessName: res.data.businessName || 'Vastrams',
          logo: res.data.logo || '',
        }
        setCompanyProfile(merged)
        try {
          localStorage.setItem('vastrams_cached_profile', JSON.stringify(merged))
        } catch {}
      }
    } catch {
      // Silently keep default fallback
    } finally {
      setLoadingProfile(false)
    }
  }, [user])

  useEffect(() => {
    fetchCompanyProfile()
  }, [fetchCompanyProfile])

  // Update browser favicon dynamically when company logo is set
  useEffect(() => {
    if (companyProfile.logo) {
      let link = document.querySelector("link[rel*='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'shortcut icon'
        document.head.appendChild(link)
      }
      link.href = companyProfile.logo
    }
  }, [companyProfile.logo])

  // Update browser document title dynamically
  useEffect(() => {
    if (companyProfile.businessName && companyProfile.businessName !== 'Vastrams') {
      document.title = `${companyProfile.businessName} - Vendor & Finance Management`
    }
  }, [companyProfile.businessName])

  const updateCompanyProfile = useCallback((newProfileData) => {
    setCompanyProfile(prev => ({
      ...prev,
      ...newProfileData,
    }))
  }, [])

  return (
    <ProfileContext.Provider value={{ companyProfile, loadingProfile, fetchCompanyProfile, updateCompanyProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useCompanyProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useCompanyProfile must be used within a ProfileProvider')
  }
  return context
}
