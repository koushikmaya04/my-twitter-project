
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(160)
  bio?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarSmallUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarLargeUrl?: string | null;
}
