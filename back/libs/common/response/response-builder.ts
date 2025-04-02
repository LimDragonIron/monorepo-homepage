import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ResponseBuilder<T = any, P = any> {
  @Exclude() private _data: T;
  @Exclude() private _message: string;
  @Exclude() private _code: string;
  @Exclude() private _meta: P;

  static Error<T = any, P = any>(
    message: string,
    code: string,
    meta?: P,
  ): ResponseBuilder<T, P> {
    return new ResponseBuilder<T, P>(null, message, code, meta);
  }

  private constructor(data: T, message: string, code: string, meta: P) {
    this._data = data;
    this._message = message;
    this._code = code;
    this._meta = meta;
  }

  @ApiProperty()
  @Expose()
  get code(): string {
    return this._code;
  }

  @ApiProperty()
  @Expose()
  get message(): string {
    return this._message;
  }

  @ApiProperty()
  @Expose()
  get timestamp(): string {
    return new Date().toISOString();
  }

  @ApiProperty()
  @Expose()
  get meta(): P {
    return this._meta;
  }
}
