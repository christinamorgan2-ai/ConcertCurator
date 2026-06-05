import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { supabase } from '../supabaseClient';

const FAQItem = ({ question, answer, isOpen, onToggle }) => {
  const contentRef = useRef(null);
  const [height, setHeight] = useState('0px');

  useEffect(() => {
    if (isOpen) {
      setHeight(`${contentRef.current?.scrollHeight}px`);
    } else {
      setHeight('0px');
    }
  }, [isOpen]);

  return (
    <div className={`faq-item ${isOpen ? 'active' : ''}`}>
      <button className="faq-question-btn" onClick={onToggle}>
        <h3 className="faq-question-text">{question}</h3>
        <ChevronDown className="faq-chevron" size={20} />
      </button>
      <div 
        className="faq-answer-wrapper" 
        style={{ maxHeight: height }}
      >
        <div ref={contentRef} className="faq-answer-content">
          {(() => {
            if (!answer) return null;
            // Support both backslash (\n, \n\n) and forward slash (/n, /n/n) or raw newlines
            const paragraphs = answer
              .replace(/\/n\/n/gi, '\n\n')
              .replace(/\/n/gi, '\n')
              .replace(/\\n\\n/gi, '\n\n')
              .replace(/\\n/gi, '\n')
              .replace(/\r\n/g, '\n')
              .split(/\n\n+/);

            return paragraphs.map((para, i, arr) => (
              <p key={i} style={{ margin: 0, marginBottom: i === arr.length - 1 ? 0 : '1rem' }}>
                {para}
              </p>
            ));
          })()}
        </div>
      </div>
    </div>
  );
};

const LOCAL_FALLBACK_FAQS = [
  {
    question: "What is Concert Curator?",
    answer: "Concert Curator is a passion project built to help people keep track of the live music they've seen and turn that history into something visual, searchable, and meaningful.\n\nThe idea came from my own life after moving to Atlanta from the Twin Cities. Atlanta has a huge live music scene, and I suddenly found myself going to far more concerts than I ever expected. Some were shows I intentionally sought out, but many happened because of the people I met here: my significant other is deeply connected to the concert scene, and a friend who worked at a venue would sometimes have tickets. Before long, I realized I genuinely could not remember every show I had attended.\n\nConcert Curator started as a way to answer a simple question: What have I actually seen? From there, it became a way to explore patterns: which genres I gravitate toward, which venues I visit most, how my concert history has changed over time, and what my live music life looks like as data."
  },
  {
    question: "Can I change an artist's genres?",
    answer: "Yes. You can edit an artist's genres at any time. \n\nConcert Curator lets you add your own genres manually, or you can use MusicBrainz as a starting point. To sync genre suggestions from MusicBrainz, go to the Artists page and use the MusicBrainz sync option. \n\n MusicBrainz is a collaborative, community-maintained music database, and its genre data reflects the work of people who contribute their knowledge across artists, recordings, releases, and musical scenes. That makes it a valuable resource for getting started, especially when you are building out your concert history across lots of artists. \n\n But genres are personal, flexible, and sometimes debatable. Concert Curator treats MusicBrainz suggestions as helpful input, not a final answer. You can keep the suggested genres, remove them, or add your own so your dashboard reflects the way you think about the music you’ve seen. \n\n If you notice missing or inaccurate genre information, you can also support the broader music data community by contributing directly to MusicBrainz: adding genres, or upvoting and downvoting existing genre tags. Those small contributions help make the data better for everyone who relies on the project."
  },
  {
    question: "Is my concert data stored securely?",
    answer: "All user data is securely stored in a Supabase backend database, protected by row-level security (RLS) policies. Only you have access to modify your concert logs unless you choose to make your profile public."
  },
  {
    question: "Can I export or download my concert history?",
    answer: "Currently, you can manage and view all your data directly inside the dashboard. CSV export features and data portability utilities are scheduled to be implemented in a future update to help you keep offline backups."
  },
  {
    question: "How do I share my Concert Dashboard with others?",
    answer: "You can head over to your Settings page and enable the 'Public Profile' toggle. Once enabled, you'll receive a unique public community link that you can share with friends to let them view your dashboard and Music Map."
  },
  {
    question: "What is the Music Map and how is it generated?",
    answer: "The Music Map is a dynamic force-directed network graph that visualizes the connections between your most-watched music genres and artists. It builds a visual web of your musical tastes based on your logged concert history."
  },
  {
    question: "How can I submit bugs or request new features?",
    answer: "I'd love to hear your suggestions! You can visit the Contact page to connect with me directly on LinkedIn or report any technical issues with the application."
  }
];

export const FAQPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState(null);
  const [faqs, setFaqs] = useState(LOCAL_FALLBACK_FAQS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        const { data, error } = await supabase
          .from('faq_kb_documents')
          .select('question, answer')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          setFaqs(data);
        } else {
          console.warn("Supabase FAQ documents table returned empty. Using local fallback.");
        }
      } catch (err) {
        console.warn("Could not fetch FAQ documents from Supabase, falling back to local list. Error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFAQs();
  }, []);

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const filteredFaq = faqs.filter(item => 
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="faq-container">
      <div className="faq-header">
        <h1 className="faq-title">Frequently Asked Questions</h1>
        <p className="faq-subtitle">Find answers to common questions about managing and sharing your live music history.</p>
      </div>

      <div className="faq-search-wrapper">
        <Search className="faq-search-icon" size={20} />
        <input 
          type="text" 
          placeholder="Search questions or answers..." 
          className="faq-search-input"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setOpenIndex(null); // Reset open states on search to avoid weird visual heights
          }}
        />
      </div>

      {filteredFaq.length > 0 ? (
        <div className="faq-list">
          {filteredFaq.map((item, index) => (
            <FAQItem 
              key={index}
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>
      ) : (
        <div className="faq-no-results">
          <p>No FAQ matching your search terms. Try searching for "Spotify", "Security", or "Map".</p>
        </div>
      )}
    </div>
  );
};
