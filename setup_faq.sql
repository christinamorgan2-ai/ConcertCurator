-- Enable the pgvector extension if it isn't already enabled (optional, for vector storage)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the table for main FAQ documents
CREATE TABLE IF NOT EXISTS faq_kb_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create the table for RAG chunks
CREATE TABLE IF NOT EXISTS faq_kb_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES faq_kb_documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- 1536 is the standard dimension for OpenAI text-embedding-ada-002 / text-embedding-3-small
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_faq_kb_chunks_doc_id ON faq_kb_chunks(document_id);

-- Enable Row Level Security (RLS)
ALTER TABLE faq_kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_kb_chunks ENABLE ROW LEVEL SECURITY;

-- Allow public read access to documents and chunks
CREATE POLICY "Allow public read access to FAQ documents" 
ON faq_kb_documents FOR SELECT 
USING (true);

CREATE POLICY "Allow public read access to FAQ chunks" 
ON faq_kb_chunks FOR SELECT 
USING (true);

-- Allow authenticated insert/update/delete for admin actions (if needed later)
CREATE POLICY "Allow authenticated users all actions" 
ON faq_kb_documents FOR ALL 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users all actions on chunks" 
ON faq_kb_chunks FOR ALL 
TO authenticated 
USING (true);

-- Truncate existing entries first (clean seed)
TRUNCATE faq_kb_chunks CASCADE;
TRUNCATE faq_kb_documents CASCADE;

-- Insert Seed Data via a Postgres Transaction Block
DO $$
DECLARE
    doc1_id UUID := gen_random_uuid();
    doc2_id UUID := gen_random_uuid();
    doc3_id UUID := gen_random_uuid();
    doc4_id UUID := gen_random_uuid();
    doc5_id UUID := gen_random_uuid();
    doc6_id UUID := gen_random_uuid();
    doc7_id UUID := gen_random_uuid();
BEGIN
    -- Insert doc 1
    INSERT INTO faq_kb_documents (id, category, question, answer, sort_order) VALUES (
        doc1_id,
        'General',
        'What is Concert Curator?',
        'Concert Curator is a passion project built to help people keep track of the live music they''ve seen and turn that history into something visual, searchable, and meaningful.

The idea came from my own life after moving to Atlanta from the Twin Cities. Atlanta has a huge live music scene, and I suddenly found myself going to far more concerts than I ever expected. Some were shows I intentionally sought out, but many happened because of the people I met here: my significant other is deeply connected to the concert scene, and a friend who worked at a venue would sometimes have tickets. Before long, I realized I genuinely could not remember every show I had attended.

Concert Curator started as a way to answer a simple question: What have I actually seen? From there, it became a way to explore patterns: which genres I gravitate toward, which venues I visit most, how my concert history has changed over time, and what my live music life looks like as data.',
        1
    );

    -- Insert doc 1 chunks
    INSERT INTO faq_kb_chunks (document_id, chunk_index, content) VALUES
    (doc1_id, 0, 'Concert Curator is a passion project built to help people keep track of the live music they''ve seen and turn that history into something visual, searchable, and meaningful.'),
    (doc1_id, 1, 'The idea came from my own life after moving to Atlanta from the Twin Cities. Atlanta has a huge live music scene, and I suddenly found myself going to far more concerts than I ever expected. Some were shows I intentionally sought out, but many happened because of the people I met here: my significant other is deeply connected to the concert scene, and a friend who worked at a venue would sometimes have tickets. Before long, I realized I genuinely could not remember every show I had attended.'),
    (doc1_id, 2, 'Concert Curator started as a way to answer a simple question: What have I actually seen? From there, it became a way to explore patterns: which genres I gravitate toward, which venues I visit most, how my concert history has changed over time, and what my live music life looks like as data.');

    -- Insert doc 2
    INSERT INTO faq_kb_documents (id, category, question, answer, sort_order) VALUES (
        doc2_id,
        'Genres',
        'Can I change an artist''s genres?',
        'Yes. You can edit an artist''s genres at any time.

Concert Curator lets you add your own genres manually, or you can use MusicBrainz as a starting point. To sync genre suggestions from MusicBrainz, go to the Artists page and use the MusicBrainz sync option.

MusicBrainz is a collaborative, community-maintained music database, and its genre data reflects the work of people who contribute their knowledge across artists, recordings, releases, and musical scenes. That makes it a valuable resource for getting started, especially when you are building out your concert history across lots of artists.

But genres are personal, flexible, and sometimes debatable. Concert Curator treats MusicBrainz suggestions as helpful input, not a final answer. You can keep the suggested genres, remove them, or add your own so your dashboard reflects the way you think about the music you’ve seen.

If you notice missing or inaccurate genre information, you can also support the broader music data community by contributing directly to MusicBrainz: adding genres, or upvoting and downvoting existing genre tags. Those small contributions help make the data better for everyone who relies on the project.',
        2
    );

    -- Insert doc 2 chunks
    INSERT INTO faq_kb_chunks (document_id, chunk_index, content) VALUES
    (doc2_id, 0, 'Yes. You can edit an artist''s genres at any time.'),
    (doc2_id, 1, 'Concert Curator lets you add your own genres manually, or you can use MusicBrainz as a starting point. To sync genre suggestions from MusicBrainz, go to the Artists page and use the MusicBrainz sync option.'),
    (doc2_id, 2, 'MusicBrainz is a collaborative, community-maintained music database, and its genre data reflects the work of people who contribute their knowledge across artists, recordings, releases, and musical scenes. That makes it a valuable resource for getting started, especially when you are building out your concert history across lots of artists.'),
    (doc2_id, 3, 'But genres are personal, flexible, and sometimes debatable. Concert Curator treats MusicBrainz suggestions as helpful input, not a final answer. You can keep the suggested genres, remove them, or add your own so your dashboard reflects the way you think about the music you’ve seen.'),
    (doc2_id, 4, 'If you notice missing or inaccurate genre information, you can also support the broader music data community by contributing directly to MusicBrainz: adding genres, or upvoting and downvoting existing genre tags. Those small contributions help make the data better for everyone who relies on the project.');

    -- Insert doc 3
    INSERT INTO faq_kb_documents (id, category, question, answer, sort_order) VALUES (
        doc3_id,
        'Security',
        'Is my concert data stored securely?',
        'All user data is securely stored in a Supabase backend database, protected by row-level security (RLS) policies. Only you have access to modify your concert logs unless you choose to make your profile public.',
        3
    );

    -- Insert doc 3 chunks
    INSERT INTO faq_kb_chunks (document_id, chunk_index, content) VALUES
    (doc3_id, 0, 'All user data is securely stored in a Supabase backend database, protected by row-level security (RLS) policies. Only you have access to modify your concert logs unless you choose to make your profile public.');

    -- Insert doc 4
    INSERT INTO faq_kb_documents (id, category, question, answer, sort_order) VALUES (
        doc4_id,
        'Data',
        'Can I export or download my concert history?',
        'Currently, you can manage and view all your data directly inside the dashboard. CSV export features and data portability utilities are scheduled to be implemented in a future update to help you keep offline backups.',
        4
    );

    -- Insert doc 4 chunks
    INSERT INTO faq_kb_chunks (document_id, chunk_index, content) VALUES
    (doc4_id, 0, 'Currently, you can manage and view all your data directly inside the dashboard. CSV export features and data portability utilities are scheduled to be implemented in a future update to help you keep offline backups.');

    -- Insert doc 5
    INSERT INTO faq_kb_documents (id, category, question, answer, sort_order) VALUES (
        doc5_id,
        'Community',
        'How do I share my Concert Dashboard with others?',
        'You can head over to your Settings page and enable the ''Public Profile'' toggle. Once enabled, you''ll receive a unique public community link that you can share with friends to let them view your dashboard and Music Map.',
        5
    );

    -- Insert doc 5 chunks
    INSERT INTO faq_kb_chunks (document_id, chunk_index, content) VALUES
    (doc5_id, 0, 'You can head over to your Settings page and enable the ''Public Profile'' toggle. Once enabled, you''ll receive a unique public community link that you can share with friends to let them view your dashboard and Music Map.');

    -- Insert doc 6
    INSERT INTO faq_kb_documents (id, category, question, answer, sort_order) VALUES (
        doc6_id,
        'Music Map',
        'What is the Music Map and how is it generated?',
        'The Music Map is a dynamic force-directed network graph that visualizes the connections between your most-watched music genres and artists. It builds a visual web of your musical tastes based on your logged concert history.',
        6
    );

    -- Insert doc 6 chunks
    INSERT INTO faq_kb_chunks (document_id, chunk_index, content) VALUES
    (doc6_id, 0, 'The Music Map is a dynamic force-directed network graph that visualizes the connections between your most-watched music genres and artists. It builds a visual web of your musical tastes based on your logged concert history.');

    -- Insert doc 7
    INSERT INTO faq_kb_documents (id, category, question, answer, sort_order) VALUES (
        doc7_id,
        'Support',
        'How can I submit bugs or request new features?',
        'I''d love to hear your suggestions! You can visit the Contact page to connect with me directly on LinkedIn or report any technical issues with the application.',
        7
    );

    -- Insert doc 7 chunks
    INSERT INTO faq_kb_chunks (document_id, chunk_index, content) VALUES
    (doc7_id, 0, 'I''d love to hear your suggestions! You can visit the Contact page to connect with me directly on LinkedIn or report any technical issues with the application.');

END $$;
