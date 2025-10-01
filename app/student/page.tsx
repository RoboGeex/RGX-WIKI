"use client"

import { useState, useEffect, Suspense } from 'react'
import Link from "next/link"
import Image from "next/image"

interface WikiSummary {
  wiki: any
  lessonCount: number
}

function StudentContent() {
  const [summaries, setSummaries] = useState<WikiSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch wikis from API
        const response = await fetch('/api/wikis')
        if (!response.ok) throw new Error('Failed to fetch wikis')
        const wikis = await response.json()
        
        const summariesData = await Promise.all(
          wikis.map(async (wiki: any) => {
            // For now, just return basic info without lesson counts
            // We can add lesson counting later via API if needed
            return { wiki, lessonCount: 0 }
          })
        )
        setSummaries(summariesData)
      } catch (error) {
        console.error('Error loading wikis:', error)
        setSummaries([])
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading wikis...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-12 space-y-10">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">RoboGeex Academy</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose a wiki to start learning. Each wiki contains lessons designed for different grade levels and topics.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map(({ wiki, lessonCount }) => (
            <Link
              key={wiki.slug}
              href={`/en/${wiki.slug}`}
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-primary/40 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="space-y-4">
                {/* Wiki Image */}
                {wiki.picture && (
                  <div className="aspect-video rounded-xl overflow-hidden bg-gray-100">
                    <Image
                      src={wiki.picture}
                      alt={wiki.displayName || wiki.slug}
                      width={400}
                      height={225}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                )}
                
                {/* Wiki Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 group-hover:text-primary transition-colors">
                      {wiki.displayName || wiki.slug}
                    </h2>
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {wiki.grade || 'All Grades'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    {lessonCount} lesson{lessonCount === 1 ? '' : 's'} available
                  </p>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Start Learning
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {summaries.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Wikis Available</h3>
            <p className="text-gray-600">Check back later for new learning content.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <StudentContent />
    </Suspense>
  )
}
