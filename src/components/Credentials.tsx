import React, { useState } from "react";
import { motion } from "framer-motion";
import { brand } from "../config/brand";
import { contactInfo } from "../config/contactInfo";

const education = [
  {
    degree: "Master of Music, Viola Performance",
    school: "Manhattan School of Music",
    detail: "Major teacher: Samuel Rhodes · 2017–2019",
  },
  {
    degree: "Bachelor of Music, Viola Performance",
    school: "Peabody Institute of Johns Hopkins University",
    detail: "Major teacher: Victoria Chiang · 2009–2013",
  },
  {
    degree: "Study Abroad",
    school: "Yong Siew Toh Conservatory, National University of Singapore",
    detail: "Major teacher: Zhang Manchin · 2011",
  },
];

const performance = [
  {
    role: "Assistant Principal Viola",
    org: "Southeastern Pennsylvania Symphony Orchestra",
    note: "Formerly North Penn Symphony · Allan R. Scott, Music Director",
    years: "2024–2025",
  },
  {
    role: "Viola, MSM Symphony Orchestra",
    org: "Centennial Gala, Carnegie Hall",
    note: "Leonard Slatkin, conductor · with Glenn Dicterow, Susan Graham, et al.",
    years: "2019",
  },
  {
    role: "Substitute Viola",
    org: "Lancaster Symphony & Pennsylvania Philharmonic",
    note: "Ongoing regional orchestral work in Pennsylvania",
    years: "2013–2025",
  },
  {
    role: "Festival Artist",
    org: "Aspen Music Festival and School",
    note: "Study with Victoria Chiang and Jeffrey Irvine",
    years: "2011–2012",
  },
];

const pathway = [
  {
    level: "Foundations",
    items: "Wohlfahrt · Kayser · Schradieck · first concertos (Telemann, JC Bach)",
  },
  {
    level: "Developing",
    items:
      "Dont · Kreutzer · Bach cello suites (selected) · Hoffmeister / Stamitz concertos",
  },
  {
    level: "Advanced",
    items:
      "Rode · Campagnoli · Walton / Bartók / Hindemith · Brahms op. 120 · Schubert Arpeggione",
  },
];

const Credentials: React.FC = () => {
  const [showFullRep, setShowFullRep] = useState(false);

  return (
    <section id="credentials" className="py-20 bg-paper">
      <div className="section-container">
        <div className="max-w-3xl mb-14">
          <motion.p
            className="text-[11px] uppercase tracking-[0.18em] text-sky-deep font-semibold mb-3"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Credentials
          </motion.p>
          <motion.h2
            className="font-display text-4xl font-semibold text-ink mb-4"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Training that shows up in every lesson
          </motion.h2>
          <motion.p
            className="text-lg text-muted"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {brand.instructorName} brings conservatory training and professional
            orchestral experience to private violin and viola study in{" "}
            {contactInfo.area}, {contactInfo.state}.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="font-display text-2xl text-ink mb-6">Education</h3>
            <ul className="space-y-5">
              {education.map((item) => (
                <li key={item.school} className="border-l-2 border-sky pl-4">
                  <p className="font-medium text-ink">{item.degree}</p>
                  <p className="text-ink-soft">{item.school}</p>
                  <p className="text-sm text-muted mt-0.5">{item.detail}</p>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted mt-6">
              Masterclasses with Heidi Castleman, Kim Kashkashian, Jeffrey Irvine,
              Patricia McCarty, Masao Kawasaki, and others. Festivals include
              Aspen, Meadowmount, and Trentino.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
          >
            <h3 className="font-display text-2xl text-ink mb-6">
              Performance
            </h3>
            <ul className="space-y-5">
              {performance.map((item) => (
                <li
                  key={`${item.org}-${item.years}`}
                  className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4"
                >
                  <div>
                    <p className="font-medium text-ink">{item.role}</p>
                    <p className="text-ink-soft">{item.org}</p>
                    <p className="text-sm text-muted mt-0.5">{item.note}</p>
                  </div>
                  <p className="text-sm text-sky-deep font-semibold shrink-0 sm:pt-0.5">
                    {item.years}
                  </p>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div
          className="border border-line bg-white px-6 py-8 sm:px-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <h3 className="font-display text-2xl text-ink">
                Repertoire pathway
              </h3>
              <p className="text-sm text-muted mt-2 max-w-xl">
                A clear ladder from first études to advanced concertos — matched
                to each student&apos;s goals, not a one-size curriculum.
              </p>
            </div>
            <button
              type="button"
              className="text-sm text-sky-deep font-semibold hover:underline text-left"
              onClick={() => setShowFullRep((v) => !v)}
            >
              {showFullRep ? "Hide sample titles" : "Show sample titles"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pathway.map((tier) => (
              <div key={tier.level}>
                <p className="text-[11px] uppercase tracking-[0.16em] text-sky-deep font-semibold mb-2">
                  {tier.level}
                </p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  {tier.items}
                </p>
              </div>
            ))}
          </div>

          {showFullRep && (
            <div className="mt-8 pt-8 border-t border-line grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-muted">
              <div>
                <p className="text-ink font-medium mb-2">Solo (selected)</p>
                <p className="leading-relaxed">
                  Telemann Concerto in G · Hoffmeister Concerto in D · Stamitz
                  Concerto No. 1 · Bach Cello Suites · Brahms Sonatas op. 120 ·
                  Schubert Arpeggione · Walton Concerto · Bartók Concerto ·
                  Hindemith Der Schwanendreher · Mozart Sinfonia Concertante
                  K. 364
                </p>
              </div>
              <div>
                <p className="text-ink font-medium mb-2">Études</p>
                <p className="leading-relaxed">
                  Wohlfahrt · Kayser · Schradieck · Dont · Kreutzer · Rode ·
                  Campagnoli
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default Credentials;
