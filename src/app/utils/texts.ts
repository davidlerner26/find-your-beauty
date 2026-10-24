// Texts that go in attributes of the templates (aria-label, alt, placeholder, title): a template can't translate
// them when they depend on the state of the screen, so they are written here
export const T = {
  favorite: (on: boolean) => (on ? $localize`Remover dos favoritos` : $localize`Favoritar`),
  copyAddress: (copied: boolean) => (copied ? $localize`Endereço copiado` : $localize`Copiar endereço`),
  addService: (selected: boolean, name: string) =>
    selected ? $localize`Remover ${name}:name:` : $localize`Adicionar ${name}:name:`,
  stars: (count: number) => (count === 1 ? $localize`1 estrela` : $localize`${count}:count: estrelas`),
  step: (n: number) => $localize`Passo ${n}:n:`,
  digit: (n: number) => $localize`Número ${n}:n: do código`,
  removeRecent: (text: string) => $localize`Remover ${text}:text:`,
  photoOf: (name: string) => $localize`Foto de ${name}:name:`,
  workOf: (name: string) => $localize`Trabalho de ${name}:name:`,
  instagramPhotoOf: (name: string) => $localize`Foto do Instagram de ${name}:name:`,
  profilePhoto: () => $localize`Foto do perfil`,
  searchMessages: (professional: boolean) =>
    professional ? $localize`Buscar mensagens ou cliente` : $localize`Buscar mensagens ou profissional`,
};
