document.addEventListener('DOMContentLoaded', () => {
    // App State
    let releasesData = [];
    let currentFilterType = 'all';
    let searchQuery = '';
    let selectedUpdate = null;
    let selectedDate = null;
    let selectedLink = null;
    let currentTemplate = 'default';

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const lastFetchedText = document.getElementById('last-fetched-text');
    const statusDot = document.querySelector('.status-dot');
    
    // Stats elements
    const statValTotal = document.getElementById('stat-val-total');
    const statValFeatures = document.getElementById('stat-val-features');
    const statValChanged = document.getElementById('stat-val-changed');
    const statValDeprecated = document.getElementById('stat-val-deprecated');

    // Controls
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const categoryFilters = document.getElementById('category-filters');

    // Feed container states
    const feedLoading = document.getElementById('feed-loading');
    const feedError = document.getElementById('feed-error');
    const feedEmpty = document.getElementById('feed-empty');
    const releasesFeed = document.getElementById('releases-feed');
    const errorTitle = document.getElementById('error-title');
    const errorMessage = document.getElementById('error-message');
    const retryBtn = document.getElementById('retry-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');

    // Modal elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCountNum = document.getElementById('char-count-num');
    const progressCircle = document.getElementById('progress-ring-circle');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const copyBtnText = document.getElementById('copy-btn-text');
    const publishTweetBtn = document.getElementById('publish-tweet-btn');
    const templateOptions = document.querySelector('.template-options');

    // Progress Ring Calculations (r = 10)
    const radius = 10;
    const circumference = 2 * Math.PI * radius;
    if (progressCircle) {
        progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        progressCircle.style.strokeDashoffset = circumference;
    }

    // Initialize application
    init();

    function init() {
        fetchReleases(false);
        setupEventListeners();
    }

    // Event Listeners Setup
    function setupEventListeners() {
        // Refresh actions
        refreshBtn.addEventListener('click', () => fetchReleases(true));
        retryBtn.addEventListener('click', () => fetchReleases(true));

        // Search action
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            if (searchQuery) {
                clearSearchBtn.style.display = 'block';
            } else {
                clearSearchBtn.style.display = 'none';
            }
            filterAndRenderFeed();
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            clearSearchBtn.style.display = 'none';
            filterAndRenderFeed();
            searchInput.focus();
        });

        // Filter clicks
        categoryFilters.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-tag')) {
                // Update active class
                document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
                e.target.classList.add('active');
                
                currentFilterType = e.target.dataset.type;
                filterAndRenderFeed();
            }
        });

        resetFiltersBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            clearSearchBtn.style.display = 'none';
            document.querySelectorAll('.filter-tag').forEach(tag => {
                if (tag.dataset.type === 'all') tag.classList.add('active');
                else tag.classList.remove('active');
            });
            currentFilterType = 'all';
            filterAndRenderFeed();
        });

        // Tweet Modal interactions
        closeModalBtn.addEventListener('click', closeTweetModal);
        
        tweetModal.addEventListener('click', (e) => {
            if (e.target === tweetModal) {
                closeTweetModal();
            }
        });

        tweetTextarea.addEventListener('input', updateCharCount);

        // Copy Tweet Text
        copyTweetBtn.addEventListener('click', () => {
            const text = tweetTextarea.value;
            navigator.clipboard.writeText(text).then(() => {
                const originalText = copyBtnText.textContent;
                copyTweetBtn.classList.remove('btn-secondary');
                copyTweetBtn.classList.add('btn-primary');
                copyBtnText.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                
                setTimeout(() => {
                    copyTweetBtn.classList.remove('btn-primary');
                    copyTweetBtn.classList.add('btn-secondary');
                    copyBtnText.textContent = 'Copy Text';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        });

        // Publish Tweet on Twitter/X
        publishTweetBtn.addEventListener('click', () => {
            const text = tweetTextarea.value;
            const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
        });

        // Template Selector
        templateOptions.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-outline-tab')) {
                document.querySelectorAll('.template-options .btn-outline-tab').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
                currentTemplate = e.target.dataset.template;
                
                // Regenerate tweet draft with new template style
                generateTweetDraft();
            }
        });
    }

    // Fetch releases data from Flask API
    function fetchReleases(forceRefresh = false) {
        setLoadingState(true);
        
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned status ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'error') {
                    throw new Error(data.message);
                }
                
                releasesData = data.releases || [];
                
                // Update header status
                if (data.last_fetched) {
                    const date = new Date(data.last_fetched);
                    lastFetchedText.textContent = `Sync: ${formatRelativeTime(date)}`;
                } else {
                    lastFetchedText.textContent = 'Synchronized';
                }
                
                // Render dashboard statistics
                calculateStats();
                
                // Render feed
                filterAndRenderFeed();
                
                setLoadingState(false);
            })
            .catch(error => {
                console.error("Fetch error:", error);
                setLoadingState(false);
                showErrorState(error.message);
            });
    }

    // Toggle Loading state in UI
    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshBtn.disabled = true;
            refreshIcon.classList.add('spinning');
            statusDot.classList.add('loading');
            
            feedLoading.style.display = 'flex';
            feedError.style.display = 'none';
            feedEmpty.style.display = 'none';
            releasesFeed.style.display = 'none';
        } else {
            refreshBtn.disabled = false;
            refreshIcon.classList.remove('spinning');
            statusDot.classList.remove('loading');
            feedLoading.style.display = 'none';
        }
    }

    // Show Error UI
    function showErrorState(msg) {
        releasesFeed.style.display = 'none';
        feedEmpty.style.display = 'none';
        feedLoading.style.display = 'none';
        
        feedError.style.display = 'flex';
        errorMessage.textContent = msg || 'Unable to load BigQuery release notes. Check your server logs or connection.';
    }

    // Calculate Dashboard statistics
    function calculateStats() {
        let total = 0;
        let features = 0;
        let changed = 0;
        let deprecated = 0;

        releasesData.forEach(entry => {
            if (entry.updates && Array.isArray(entry.updates)) {
                entry.updates.forEach(update => {
                    total++;
                    const type = (update.type || '').toLowerCase();
                    
                    if (type === 'feature') {
                        features++;
                    } else if (type === 'changed' || type === 'fixed') {
                        changed++;
                    } else if (type === 'deprecated' || type === 'issue') {
                        deprecated++;
                    }
                });
            }
        });

        // Update statistics counters (can add animate effect if desired)
        animateValue(statValTotal, total);
        animateValue(statValFeatures, features);
        animateValue(statValChanged, changed);
        animateValue(statValDeprecated, deprecated);
    }

    // Animate stats values
    function animateValue(obj, startVal, endVal, duration = 800) {
        // If endVal is omitted, swap variables to count from current value to target
        if (endVal === undefined) {
            endVal = startVal;
            startVal = parseInt(obj.textContent) || 0;
        }
        
        if (startVal === endVal) {
            obj.textContent = endVal;
            return;
        }
        
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.textContent = Math.floor(progress * (endVal - startVal) + startVal);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.textContent = endVal;
            }
        };
        window.requestAnimationFrame(step);
    }

    // Filter and display the timeline feed
    function filterAndRenderFeed() {
        releasesFeed.innerHTML = '';
        
        let matchingCount = 0;
        
        releasesData.forEach(entry => {
            // Filter the updates in this entry
            const filteredUpdates = (entry.updates || []).filter(update => {
                // Category Type matching
                const matchesType = currentFilterType === 'all' || 
                    update.type.toLowerCase() === currentFilterType.toLowerCase();
                
                // Keyword Search matching
                const matchesSearch = !searchQuery || 
                    (update.type || '').toLowerCase().includes(searchQuery) ||
                    (update.description_text || '').toLowerCase().includes(searchQuery) ||
                    (entry.date || '').toLowerCase().includes(searchQuery);
                    
                return matchesType && matchesSearch;
            });

            if (filteredUpdates.length > 0) {
                matchingCount += filteredUpdates.length;
                
                // Create Timeline Group for this date
                const groupEl = document.createElement('div');
                groupEl.className = 'timeline-group';
                
                // Format display date
                const headerEl = document.createElement('div');
                headerEl.className = 'timeline-date-header';
                
                const dotEl = document.createElement('div');
                dotEl.className = 'timeline-dot';
                
                // Add tag indicating release date and how old it is
                const ageLabel = getRelativeDateLabel(entry.date);
                headerEl.innerHTML = `${entry.date} <span class="date-badge">${ageLabel}</span>`;
                
                groupEl.appendChild(dotEl);
                groupEl.appendChild(headerEl);
                
                const cardsContainer = document.createElement('div');
                cardsContainer.className = 'timeline-cards-container';
                
                filteredUpdates.forEach(update => {
                    const cardEl = createReleaseCard(update, entry);
                    cardsContainer.appendChild(cardEl);
                });
                
                groupEl.appendChild(cardsContainer);
                releasesFeed.appendChild(groupEl);
            }
        });

        // Toggle Empty/Feed states based on matching releases
        if (matchingCount === 0) {
            releasesFeed.style.display = 'none';
            feedEmpty.style.display = 'flex';
        } else {
            feedEmpty.style.display = 'none';
            releasesFeed.style.display = 'block';
        }
    }

    // Create DOM card elements for individual releases
    function createReleaseCard(update, entry) {
        const card = document.createElement('div');
        card.className = 'release-card';
        card.dataset.id = `${entry.id}-${update.type}`;
        
        const typeClass = `badge-${(update.type || 'general').toLowerCase()}`;
        
        // Build card HTML
        card.innerHTML = `
            <div class="card-meta">
                <div class="badge-wrapper">
                    <span class="badge ${typeClass}">${update.type}</span>
                </div>
                <div class="card-actions">
                    <a href="${entry.link}" target="_blank" class="action-icon-btn btn-link-ref" title="View official Google release notes documentation">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                    <button class="action-icon-btn btn-tweet-trigger" title="Compose Tweet for this update">
                        <i class="fa-brands fa-x-twitter"></i>
                    </button>
                </div>
            </div>
            <div class="card-content">
                ${update.description_html}
            </div>
        `;

        // Card Selection highlights
        card.addEventListener('click', (e) => {
            // Ignore click if clicking links or tweet buttons
            if (e.target.closest('.action-icon-btn') || e.target.closest('a')) {
                return;
            }
            
            // Toggle highlight state
            document.querySelectorAll('.release-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        });

        // Wire tweet action
        const tweetBtn = card.querySelector('.btn-tweet-trigger');
        tweetBtn.addEventListener('click', () => {
            openTweetModal(update, entry.date, entry.link);
        });

        return card;
    }

    // Open Tweet Composer
    function openTweetModal(update, date, link) {
        selectedUpdate = update;
        selectedDate = date;
        selectedLink = link;
        
        // Reset Template tabs to default standard
        document.querySelectorAll('.template-options .btn-outline-tab').forEach(btn => {
            if (btn.dataset.template === 'default') btn.classList.add('active');
            else btn.classList.remove('active');
        });
        currentTemplate = 'default';
        
        // Generate content
        generateTweetDraft();
        
        // Display modal
        tweetModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Lock page scrolling
        
        // Auto select textarea
        setTimeout(() => {
            tweetTextarea.focus();
            // Put cursor at end of text
            tweetTextarea.selectionStart = tweetTextarea.selectionEnd = tweetTextarea.value.length;
        }, 200);
    }

    function closeTweetModal() {
        tweetModal.style.display = 'none';
        document.body.style.overflow = ''; // Unlock scrolling
        selectedUpdate = null;
        selectedDate = null;
        selectedLink = null;
    }

    // Generate draft text based on selected template
    function generateTweetDraft() {
        if (!selectedUpdate) return;
        
        const date = selectedDate;
        const type = selectedUpdate.type;
        const text = selectedUpdate.description_text;
        const link = selectedLink;
        
        // Truncate update text if it's too long for tweet limits
        // Twitter has a limit of 280 chars. 
        // We'll leave room for link, type and tags.
        let draftText = '';
        
        if (currentTemplate === 'default') {
            const tag = `⚡ BigQuery ${type} (${date}): `;
            const suffix = `\n\nRead more: ${link} #BigQuery`;
            
            // Calculate remaining space
            const allowedLen = 280 - tag.length - suffix.length;
            const truncatedText = cleanAndTruncate(text, allowedLen);
            
            draftText = `${tag}"${truncatedText}"${suffix}`;
            
        } else if (currentTemplate === 'detailed') {
            const header = `📝 BigQuery Update (${date})\n`;
            const body = `• Type: ${type}\n• Info: `;
            const footer = `\n\nDetails: ${link}`;
            
            const allowedLen = 280 - header.length - body.length - footer.length;
            const truncatedText = cleanAndTruncate(text, allowedLen);
            
            draftText = `${header}${body}${truncatedText}${footer}`;
            
        } else if (currentTemplate === 'hype') {
            const prefix = `🚀 Tech Alert: New BigQuery ${type}! `;
            const hash = `\n\n#DataEngineering #BigQuery ${link}`;
            
            const allowedLen = 280 - prefix.length - hash.length;
            const truncatedText = cleanAndTruncate(text, allowedLen);
            
            draftText = `${prefix}"${truncatedText}"${hash}`;
        }
        
        tweetTextarea.value = draftText;
        updateCharCount();
    }

    // Clean text of extra spacing/newlines and truncate to limit
    function cleanAndTruncate(str, limit) {
        // Replace multiple whitespace/newlines with space
        let clean = str.replace(/\s+/g, ' ').trim();
        
        if (clean.length <= limit) {
            return clean;
        }
        
        // Truncate at word boundary if possible
        let truncated = clean.substring(0, limit - 3);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > limit * 0.75) {
            truncated = truncated.substring(0, lastSpace);
        }
        return truncated + '...';
    }

    // Update Tweet Character Counter & progress ring
    function updateCharCount() {
        const text = tweetTextarea.value;
        const count = text.length;
        const limit = 280;
        const remaining = limit - count;
        
        charCountNum.textContent = remaining;
        
        // Progress ring styling
        if (progressCircle) {
            const percent = Math.min(count / limit, 1);
            const offset = circumference - (percent * circumference);
            progressCircle.style.strokeDashoffset = offset;
            
            // Color indicators
            if (remaining < 0) {
                progressCircle.style.stroke = '#ef4444'; // Red
                charCountNum.className = 'char-count-text danger';
                publishTweetBtn.disabled = true;
                publishTweetBtn.style.opacity = '0.5';
            } else if (remaining <= 20) {
                progressCircle.style.stroke = '#f59e0b'; // Amber
                charCountNum.className = 'char-count-text warn';
                publishTweetBtn.disabled = false;
                publishTweetBtn.style.opacity = '1';
            } else {
                progressCircle.style.stroke = '#3b82f6'; // Blue
                charCountNum.className = 'char-count-text';
                publishTweetBtn.disabled = false;
                publishTweetBtn.style.opacity = '1';
            }
        }
    }

    // Helpers
    function formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function getRelativeDateLabel(dateStr) {
        // Date parse e.g. "June 15, 2026"
        try {
            const pubDate = new Date(dateStr);
            const today = new Date();
            
            // Set times to midnight for date comparison
            pubDate.setHours(0,0,0,0);
            today.setHours(0,0,0,0);
            
            const diffTime = Math.abs(today - pubDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays <= 7) return `${diffDays} days ago`;
            
            return pubDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            return '';
        }
    }
});
