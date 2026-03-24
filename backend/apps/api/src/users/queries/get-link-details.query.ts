export class GetLinkDetailsQuery {
  constructor(
    public readonly token: string,
    public readonly mode: 'invite' | 'reset',
  ) {}
}
