import React, { useState } from 'react'
import { Plus, Minus, HelpCircle } from 'lucide-react'

const FAQS = [
  {
    question: "Is ShopSync really free to try?",
    answer: "Yes! We offer a generous free tier for small businesses. You can access all core features without entering any credit card details."
  },
  {
    question: "Can I manage multiple shops?",
    answer: "Absolutely. You can create multiple organizations under one account and switch between them instantly from your dashboard."
  },
  {
    question: "Is my data secure?",
    answer: "Security is our top priority. We use industry-standard encryption to protect your data, and we never sell your information to third parties."
  },
  {
    question: "Do I need technical skills?",
    answer: "Not at all. ShopSync is built for non-technical users. If you can send an email, you can use our platform."
  }
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section className="py-24 bg-secondary/5">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-4">
            <HelpCircle className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <div 
              key={idx}
              className="bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300"
            >
              <button
                onClick={() => setOpenIndex(idx === openIndex ? -1 : idx)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/5 transition-colors"
              >
                <span className="font-semibold text-lg text-foreground">{faq.question}</span>
                {idx === openIndex ? (
                  <Minus className="w-5 h-5 text-primary flex-shrink-0" />
                ) : (
                  <Plus className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
              </button>
              
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  idx === openIndex ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="p-6 pt-0 text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
