module.exports = {
  OS: 'web',
  select: (spec) => spec.default || spec.web,
}
