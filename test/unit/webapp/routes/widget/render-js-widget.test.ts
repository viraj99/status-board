import * as Chance from 'chance';
import { Request } from 'jest-express/lib/request';
import { Response } from 'jest-express/lib/response';
import * as itemManager from '../../../../../src/item-manager';
import logger from '../../../../../src/logger';
import { renderJsWidget } from '../../../../../src/webapp/routes/widget';
import { IChanceSystem, system } from '../../../../helpers/chance-system';

jest.mock('../../../../../src/logger', () => {
  const errorMock = jest.fn();
  return {
    default: () => ({ error: errorMock }),
    error: errorMock,
  };
});

const chance = new Chance() as Chance.Chance & IChanceSystem;
chance.mixin(system as any);

describe('Webapp: Widget: Render JS Widget', () => {
  let request: Request;
  let response: Response;

  beforeEach(() => {
    request = new Request();
    response = new Response();
    jest.spyOn(itemManager, 'getFirst').mockImplementation((path, name, type, ext, cb) => {
      if (name === 'NO_PATH') {
        cb(null, undefined);
      } else if (name === 'ERROR') {
        cb('GET_FIRST_ERROR', undefined);
      } else {
        cb(null, 'JS_FILE_CODE');
      }
    });
  });

  afterEach(() => {
    request.resetMocked();
    response.resetMocked();
  });

  test('should send js file', () => {
    const packagesPath = chance.filePath();
    const widgetName = chance.name();

    renderJsWidget(packagesPath, widgetName, request, response);

    expect(response.type).toHaveBeenCalledWith('application/javascript');
    expect(itemManager.getFirst).toHaveBeenCalledWith(
      packagesPath,
      widgetName,
      'widgets',
      '.js',
      expect.any(Function),
    );
    expect(logger().error).not.toHaveBeenCalled();
    expect(response.status).not.toHaveBeenCalled();
    expect(response.send).not.toHaveBeenCalled();
    expect(response.sendFile).toBeCalledWith('JS_FILE_CODE');
  });

  test('should return error if js file is not found', () => {
    const packagesPath = chance.filePath();
    const widgetName = 'NO_PATH';
    const expectedMsg = `JS file not found for widget ${widgetName}`;

    renderJsWidget(packagesPath, widgetName, request, response);

    expect(response.type).toHaveBeenCalledWith('application/javascript');
    expect(itemManager.getFirst).toHaveBeenCalledWith(
      packagesPath,
      widgetName,
      'widgets',
      '.js',
      expect.any(Function),
    );
    expect(logger().error).toBeCalledWith(expectedMsg);
    expect(response.status).toBeCalledWith(400);
    expect(response.send).toBeCalledWith(`Error rendering widget: ${expectedMsg}`);
    expect(response.sendFile).not.toHaveBeenCalled();
  });

  test('should return error', () => {
    const packagesPath = chance.filePath();
    const widgetName = 'ERROR';

    renderJsWidget(packagesPath, widgetName, request, response);

    expect(response.type).toHaveBeenCalledWith('application/javascript');
    expect(itemManager.getFirst).toHaveBeenCalledWith(
      packagesPath,
      widgetName,
      'widgets',
      '.js',
      expect.any(Function),
    );
    expect(logger().error).toBeCalledWith('GET_FIRST_ERROR');
    expect(response.status).toBeCalledWith(400);
    expect(response.send).toBeCalledWith('Error rendering widget: GET_FIRST_ERROR');
    expect(response.sendFile).not.toHaveBeenCalled();
  });
});
