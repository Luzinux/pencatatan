'use client'

import { motion, AnimatePresence } from 'framer-motion'
import React from 'react'

interface PageTransitionProps {
  children: React.ReactNode
  pageKey: string
  stagger?: boolean
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
}

export function PageTransition({ children, pageKey, stagger }: PageTransitionProps) {
  if (stagger && React.isValidElement(children)) {
    const childArray = React.Children.toArray(children.props.children as React.ReactNode)

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={pageKey}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {React.Children.map(children.props.children as React.ReactNode, (child, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              custom={index}
            >
              {child}
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
