import { RouteService } from '@/app/router/RouteService';
import { SchemaService } from '@/modules/schema/services/SchemaService';
import { SchemaRepository } from '@/modules/schema/repositories/SchemaRepository';
import { DocumentService } from '@/modules/document/services/DocumentService';
import { DocumentRepository } from '@/modules/document/repositories/DocumentRepository';
import { EntityService } from '@/modules/entity/services/EntityService';
import { EntityRepository } from '@/modules/entity/repositories/EntityRepository';
import { ConnectionService } from '@/modules/connection/services/ConnectionService';
import { ConnectionRepository } from '@/modules/connection/repositories/ConnectionRepository';
import { GenerationService } from '@/modules/generation/services/GenerationService';
import { OperationService } from '@/modules/operation/services/OperationService';
import { ProfileService } from '@/modules/profile/services/ProfileService';
import { PreferencesService } from '@/modules/preferences/services/PreferencesService';
import { RecentService } from '@/modules/recent/services/RecentService';

export const appProvider = {
  routeService: new RouteService(),
  schemaService: new SchemaService(new SchemaRepository()),
  documentService: new DocumentService(new DocumentRepository()),
  entityService: new EntityService(new EntityRepository()),
  connectionService: new ConnectionService(new ConnectionRepository()),
  generationService: new GenerationService(),
  operationService: new OperationService(),
  profileService: new ProfileService(),
  preferencesService: new PreferencesService(),
  recentService: new RecentService()
};
