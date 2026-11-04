import { Module } from '@nestjs/common';
import { FirestoreService } from './firebase/firestore.service';
import { RpcService } from './rpc/rpc.service';
import { RpcController } from './rpc/rpc.controller';

@Module({
  imports: [],
  controllers: [RpcController],
  providers: [FirestoreService, RpcService],
})
export class AppModule {}
