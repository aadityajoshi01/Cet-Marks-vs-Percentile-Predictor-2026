document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('predict-form');
    const resultArea = document.getElementById('result-area');
    const predictedPercentileEl = document.getElementById('predicted-percentile');
    const percentileRangeEl = document.getElementById('percentile-range');
    const predictedRankEl = document.getElementById('predicted-rank');
    const visitorCountEl = document.getElementById('visitor-count');

    // Fetch and increment visitor count using public API (GitHub Pages compatible)
    fetch('https://api.counterapi.dev/v1/mvppredictor2026/visits/up')
        .then(response => response.json())
        .then(data => {
            if (data && data.count !== undefined) {
                visitorCountEl.textContent = data.count.toLocaleString();
            }
        })
        .catch(err => {
            console.error('Error fetching visitor count:', err);
            visitorCountEl.textContent = "1k+"; // fallback
        });
        
    // Track WhatsApp clicks
    const whatsappBtn = document.getElementById('whatsapp-btn');
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', () => {
            fetch('https://api.counterapi.dev/v1/mvppredictor2026/whatsapp_clicks/up').catch(() => {});
            if (typeof gtag === 'function') gtag('event', 'whatsapp_click');
        });
    }

    // Handle attempt selection to populate dates
    const attemptSelect = document.getElementById('exam-attempt');
    const dateSelect = document.getElementById('exam-date');
    
    const attemptDates = {
        '1': ['11 April', '13 April', '15 April', '16 April', '17 April', '18 April'],
        '2': ['12 May', '13 May', '14 May', '15 May', '18 May', '19 May', '20 May', '21 May']
    };

    if (attemptSelect && dateSelect) {
        attemptSelect.addEventListener('change', (e) => {
            const attempt = e.target.value;
            dateSelect.innerHTML = '<option value="" disabled selected>Select Date</option>';
            if (attemptDates[attempt]) {
                attemptDates[attempt].forEach(date => {
                    const option = document.createElement('option');
                    option.value = date;
                    option.textContent = date;
                    dateSelect.appendChild(option);
                });
                dateSelect.disabled = false;
            } else {
                dateSelect.innerHTML = '<option value="" disabled selected>Select Date First</option>';
                dateSelect.disabled = true;
            }
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const date = document.getElementById('exam-date').value;
        const shift = document.getElementById('exam-shift').value;
        const marks = parseFloat(document.getElementById('marks').value);
        
        if (!date || !shift || isNaN(marks)) {
            alert('Please select date, shift, and enter valid marks.');
            return;
        }
        
        if (marks < 0 || marks > 200) {
            alert('Marks must be between 0 and 200.');
            return;
        }
        
        const shiftKey = `${date} ${shift}`;
        const data = shiftData[shiftKey];
        
        if (!data) {
            alert(`No data available for ${shiftKey}. Please check if the shift was conducted.`);
            return;
        }
        
        let foundRange = null;
        let isAboveHighest = false;
        let isBelowLowest = false;
        
        // Parse ranges
        const parsedData = data.map(item => {
            const marksParts = item.marks.split(/[-–]/).map(s => parseFloat(s.trim()));
            const pStr = item.percentile.replace(/%/g, '').trim();
            let pMin, pMax;
            
            if (pStr.toLowerCase().includes('below 50')) {
                pMin = 0;
                pMax = 50;
            } else {
                const pParts = pStr.split(/[-–]/).map(s => parseFloat(s.trim()));
                pMin = pParts[0];
                pMax = pParts[1] || pParts[0];
            }
            
            return {
                marksMin: marksParts[0],
                marksMax: marksParts[1] !== undefined ? marksParts[1] : marksParts[0],
                percentMin: pMin,
                percentMax: pMax,
                originalPercentile: item.percentile
            };
        });
        
        // Find matching range
        // Sort descending by marksMax just in case
        parsedData.sort((a, b) => b.marksMax - a.marksMax);
        
        for (let i = 0; i < parsedData.length; i++) {
            const r = parsedData[i];
            if (marks >= r.marksMin && marks <= r.marksMax) {
                foundRange = r;
                break;
            }
        }
        
        if (!foundRange) {
            // Check if above highest or below lowest
            const highest = parsedData[0];
            const lowest = parsedData[parsedData.length - 1];
            
            if (marks > highest.marksMax) {
                foundRange = highest;
                isAboveHighest = true;
            } else if (marks < lowest.marksMin) {
                foundRange = lowest;
                isBelowLowest = true;
            } else {
                // Should not happen if ranges are contiguous, but just in case, find closest
                foundRange = parsedData.reduce((prev, curr) => {
                    return (Math.abs(curr.marksMin - marks) < Math.abs(prev.marksMin - marks) ? curr : prev);
                });
            }
        }
        
        let predictedPercentile = 0;
        
        if (isAboveHighest) {
            // Extrapolate slightly or cap at max
            predictedPercentile = Math.min(100, foundRange.percentMax + (marks - foundRange.marksMax) * 0.01);
            if (predictedPercentile > 99.99) predictedPercentile = 99.99;
        } else if (isBelowLowest) {
            predictedPercentile = Math.max(0, foundRange.percentMin - (foundRange.marksMin - marks) * 0.1);
        } else {
            // Interpolate
            const mRange = foundRange.marksMax - foundRange.marksMin;
            const pRange = foundRange.percentMax - foundRange.percentMin;
            
            if (mRange === 0) {
                predictedPercentile = foundRange.percentMax;
            } else {
                predictedPercentile = foundRange.percentMin + ((marks - foundRange.marksMin) / mRange) * pRange;
            }
        }
        
        // Calculate approximate rank
        const TOTAL_CANDIDATES = 350000;
        let predictedRank = Math.floor((100 - predictedPercentile) * (TOTAL_CANDIDATES / 100)) + 1;
        if (predictedRank < 1) predictedRank = 1;
        
        // Display results
        let finalPercentileStr = predictedPercentile.toFixed(2) + '%';
        let finalRankStr = "~" + predictedRank.toLocaleString();
        if (isBelowLowest && predictedPercentile < 50) {
            finalPercentileStr = "Below 50%";
            finalRankStr = "> 1,75,000";
        }
        
        predictedPercentileEl.textContent = finalPercentileStr;
        percentileRangeEl.textContent = foundRange.originalPercentile;
        predictedRankEl.textContent = finalRankStr;
        
        resultArea.classList.remove('hidden');
        
        // Track prediction event in GA4 & Counter API
        if (typeof gtag === 'function') {
            gtag('event', 'percentile_predicted', {
                'event_category': 'engagement',
                'event_label': shiftKey,
                'value': Math.round(predictedPercentile)
            });
        }
        fetch('https://api.counterapi.dev/v1/mvppredictor2026/predictions/up').catch(() => {});
        
        // Smooth scroll to result
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
});
