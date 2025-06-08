import { Transform, Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, Max, Min } from "class-validator";

export class EventQueryDto {
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    page = 1;
  
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit = 10;
  
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true')
    upcoming?: boolean;
  
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true')
    includeWatermarks?: boolean;
  }