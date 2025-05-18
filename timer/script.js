document.addEventListener('DOMContentLoaded', () => {
    // Das Datum, an dem ihr zusammengekommen seid (Jahr, Monat (0-basiert!), Tag, Stunde, Minute, Sekunde)
    const startDate = new Date(2024, 2, 7, 19, 0, 0); // Monat 2 ist März

    const elements = {
        years: document.getElementById('years'),
        months: document.getElementById('months'),
        daysCurrent: document.getElementById('daysCurrent'),
        hours: document.getElementById('hours'),
        minutes: document.getElementById('minutes'),
        seconds: document.getElementById('seconds'),
        totalDaysTogether: document.getElementById('totalDaysTogether').querySelector('span'),
        daysToAnniversary: document.getElementById('daysToAnniversary'),
        hoursToAnniversary: document.getElementById('hoursToAnniversary'),
        minutesToAnniversary: document.getElementById('minutesToAnniversary'),
        secondsToAnniversary: document.getElementById('secondsToAnniversary')
    };

    function formatNumber(num) {
        return num < 10 ? '0' + num : num;
    }

    function updateTimers() {
        const now = new Date();
        
        // 1. Zeit zusammen (Jahre, Monate, Tage, H:M:S)
        let diffMs = now - startDate;

        let s = now.getSeconds() - startDate.getSeconds();
        let mn = now.getMinutes() - startDate.getMinutes();
        let hr = now.getHours() - startDate.getHours();
        let d = now.getDate() - startDate.getDate();
        let m = now.getMonth() - startDate.getMonth();
        let y = now.getFullYear() - startDate.getFullYear();

        if (s < 0) { s += 60; mn--; }
        if (mn < 0) { mn += 60; hr--; }
        if (hr < 0) { hr += 24; d--; }
        
        if (d < 0) {
            m--;
            // Tage des Vormonats von 'now'
            const daysInLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
            d += daysInLastMonth;
        }
        if (m < 0) { m += 12; y--; }

        elements.years.textContent = y;
        elements.months.textContent = m;
        elements.daysCurrent.textContent = d;
        elements.hours.textContent = formatNumber(hr);
        elements.minutes.textContent = formatNumber(mn);
        elements.seconds.textContent = formatNumber(s);

        // 2. Tage insgesamt zusammen
        const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        elements.totalDaysTogether.textContent = totalDays;

        // 3. Nächster Jahrestag
        let nextAnniversaryDate = new Date(startDate);
        nextAnniversaryDate.setFullYear(now.getFullYear());

        // Wenn der Jahrestag dieses Jahr schon war (oder heute aber die Uhrzeit schon vorbei ist),
        // dann nimm den Jahrestag im nächsten Jahr
        if (now.getTime() > nextAnniversaryDate.getTime()) {
            nextAnniversaryDate.setFullYear(now.getFullYear() + 1);
        }
        
        const diffToNextAnniversaryMs = nextAnniversaryDate - now;

        const daysTo = Math.floor(diffToNextAnniversaryMs / (1000 * 60 * 60 * 24));
        const hoursTo = Math.floor((diffToNextAnniversaryMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutesTo = Math.floor((diffToNextAnniversaryMs % (1000 * 60 * 60)) / (1000 * 60));
        const secondsTo = Math.floor((diffToNextAnniversaryMs % (1000 * 60)) / 1000);

        elements.daysToAnniversary.textContent = daysTo;
        elements.hoursToAnniversary.textContent = formatNumber(hoursTo);
        elements.minutesToAnniversary.textContent = formatNumber(minutesTo);
        elements.secondsToAnniversary.textContent = formatNumber(secondsTo);
    }

    // Initialer Aufruf und dann jede Sekunde aktualisieren
    updateTimers();
    setInterval(updateTimers, 1000);
});