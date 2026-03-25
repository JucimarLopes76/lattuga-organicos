import { useEffect } from 'react';

interface SeoProps {
    title: string;
    description?: string;
    canonicalUrl?: string;
    ogImage?: string;
}

export function useSeo({ title, description, canonicalUrl, ogImage }: SeoProps) {
    useEffect(() => {
        const previousTitle = document.title;
        const previousDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
        
        // Helper to update or create a meta tag
        const setMetaTag = (selector: string, keyAttr: string, keyVal: string, contentAttr: string, contentVal: string) => {
            let tag = document.querySelector(selector);
            if (!tag) {
                tag = document.createElement('meta');
                tag.setAttribute(keyAttr, keyVal);
                document.head.appendChild(tag);
            }
            tag.setAttribute(contentAttr, contentVal);
            return tag;
        };

        const setLinkTag = (relVal: string, hrefVal: string) => {
            let tag = document.querySelector(`link[rel="${relVal}"]`);
            if (!tag) {
                tag = document.createElement('link');
                tag.setAttribute('rel', relVal);
                document.head.appendChild(tag);
            }
            tag.setAttribute('href', hrefVal);
            return tag;
        };

        // Update Title
        document.title = title;
        setMetaTag('meta[property="og:title"]', 'property', 'og:title', 'content', title);
        setMetaTag('meta[property="twitter:title"]', 'property', 'twitter:title', 'content', title);

        // Update Description
        if (description) {
            setMetaTag('meta[name="description"]', 'name', 'description', 'content', description);
            setMetaTag('meta[property="og:description"]', 'property', 'og:description', 'content', description);
            setMetaTag('meta[property="twitter:description"]', 'property', 'twitter:description', 'content', description);
        }

        // Update Canonical
        if (canonicalUrl) {
            setLinkTag('canonical', canonicalUrl);
            setMetaTag('meta[property="og:url"]', 'property', 'og:url', 'content', canonicalUrl);
        }

        // Update Image
        if (ogImage) {
            setMetaTag('meta[property="og:image"]', 'property', 'og:image', 'content', ogImage);
            setMetaTag('meta[property="twitter:image"]', 'property', 'twitter:image', 'content', ogImage);
        }

        return () => {
            document.title = previousTitle;
            if (previousDescription) {
                setMetaTag('meta[name="description"]', 'name', 'description', 'content', previousDescription);
            }
        };
    }, [title, description, canonicalUrl, ogImage]);
}
