// Date and time formatting utilities

export function formatDate(date: Date, format: 'short' | 'long' | 'day' = 'short'): string {
    const options: Intl.DateTimeFormatOptions = {};

    switch (format) {
        case 'short':
            options.month = 'short';
            options.day = 'numeric';
            break;
        case 'long':
            options.weekday = 'long';
            options.month = 'long';
            options.day = 'numeric';
            options.year = 'numeric';
            break;
        case 'day':
            options.weekday = 'long';
            break;
    }

    return date.toLocaleDateString('en-US', options);
}

export function getWeekDates(startDate: Date = new Date()): Date[] {
    const dates: Date[] = [];
    const dayOfWeek = startDate.getDay();
    const startOfWeek = new Date(startDate);
    startOfWeek.setDate(startDate.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        dates.push(date);
    }

    return dates;
}

export function isToday(date: Date): boolean {
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
}

export function getTimeOfDay(date: Date = new Date()): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = date.getHours();

    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

export function getGreeting(date: Date = new Date()): string {
    const timeOfDay = getTimeOfDay(date);

    switch (timeOfDay) {
        case 'morning':
            return 'G\u00fcnayd\u0131n';
        case 'afternoon':
            return 'Merhaba';
        case 'evening':
            return '\u0130yi ak\u015famlar';
        case 'night':
            return '\u0130yi geceler';
    }
}

export function formatLongDateTr(date: Date): string {
    const formatter = new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long',
    });
    const parts = formatter.formatToParts(date);
    const dateParts: Partial<Record<'day' | 'month' | 'year' | 'weekday', string>> = {};

    for (const part of parts) {
        if (part.type === 'day' || part.type === 'month' || part.type === 'year' || part.type === 'weekday') {
            dateParts[part.type] = part.value;
        }
    }

    if (!dateParts.day || !dateParts.month || !dateParts.year || !dateParts.weekday) {
        return formatter.format(date);
    }

    return `${dateParts.day} ${dateParts.month} ${dateParts.year}, ${dateParts.weekday}`;
}
