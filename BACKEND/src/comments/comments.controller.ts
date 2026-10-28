import { Controller, Get } from '@nestjs/common';


@Controller('comments')
export class paramController {
 constructor() {}

 @Get('/')
 async getcomments(){
    return "This are comments"
 }
}