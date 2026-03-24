import type { AcceptLinkRequestDto } from '../dto/users.dto';

export class AcceptLinkCommand {
  constructor(
    public readonly token: string,
    public readonly mode: 'invite' | 'reset',
    public readonly payload: AcceptLinkRequestDto,
  ) {}
}
