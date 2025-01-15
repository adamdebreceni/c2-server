export function asSize(val: number): string {
    if (val < 10000) {
        return `${val}`;
    }
    const suffices = ['K', 'M', 'G', 'T', 'P'];
    for (let i = 0; i < suffices.length; ++i) {
        val /= 1000;
        if (val < 10000) {
            return `${val.toPrecision(4)}${suffices[i]}`;
        }
    }
    return `${val}${suffices[suffices.length - 1]}`;
}