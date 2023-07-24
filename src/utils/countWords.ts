function countWords(string: string) {
    const arr = string.split(' ')
    return arr.filter((word) => word !== '').length
}

export { countWords }
