import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const [companyProfile, setCompanyProfile] = useState({
    businessName: 'Vastrams',
    logo: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    website: '',
  })
  const [loadingProfile, setLoadingProfile] = useState(true)

  const fetchCompanyProfile = useCallback(async () => {
    try {
      const res = await api.get('/settings/profile')
      if (res.success && res.data) {
        setCompanyProfile(prev => ({
          ...prev,
          ...res.data,
          businessName: res.data.businessName || 'Vastrams',
          logo: res.data.logo || '',
        }))
      }
    } catch {
      // Silently keep default fallback
    } finally {
      setLoadingProfile(false)
    }
  }, [])

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
