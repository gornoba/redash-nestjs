import { Injectable } from '@nestjs/common';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import type { SaveVisualizationRequestDto } from '../dto/visualization.dto';
import { VisualizationRepository } from '../repositories/visualization.repository';

@Injectable()
export class VisualizationService {
  constructor(
    private readonly visualizationRepository: VisualizationRepository,
  ) {}

  createVisualization(
    user: AuthenticatedUser,
    payload: SaveVisualizationRequestDto,
  ) {
    return this.visualizationRepository.createVisualization(user, payload);
  }

  updateVisualization(
    user: AuthenticatedUser,
    visualizationId: number,
    payload: SaveVisualizationRequestDto,
  ) {
    return this.visualizationRepository.updateVisualization(
      user,
      visualizationId,
      payload,
    );
  }

  deleteVisualization(user: AuthenticatedUser, visualizationId: number) {
    return this.visualizationRepository.deleteVisualization(
      user,
      visualizationId,
    );
  }

  getPublicEmbed(queryId: number, visualizationId: number, apiKey: string) {
    return this.visualizationRepository.getPublicEmbed(
      queryId,
      visualizationId,
      apiKey,
    );
  }
}
