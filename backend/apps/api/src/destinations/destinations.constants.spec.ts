import { getDestinationTypeDefinition } from './destinations.constants';

describe('destination type definitions', () => {
  it('includes concrete subject template examples for email destinations', () => {
    const definition = getDestinationTypeDefinition('email');
    const description =
      definition?.configuration_schema.properties.subject_template?.description;

    expect(description).toContain(
      '사용 가능한 문법은 2가지입니다. 둘 중 하나로만 쓰면 됩니다.',
    );
    expect(description).toContain('구문 1. 레거시 문법');
    expect(description).toContain('{state}: 알림 상태. 예: TRIGGERED, OK');
    expect(description).toContain('{alert_name}: 알림 제목 전체');
    expect(description).toContain('{query_name}: 쿼리 제목');
    expect(description).toContain('{query_result_value}: 최신 결과의 값');
    expect(description).toContain('구문 2. 이중 중괄호 문법');
    expect(description).toContain('{{ALERT_STATUS}}: 알림 상태');
    expect(description).toContain('{{ALERT_NAME}}: 알림 제목 전체');
    expect(description).toContain('예시에서 가정한 값');
    expect(description).toContain('alert_name = 주문 수 이상 감지');
    expect(description).toContain('query_name = 테스트3');
    expect(description).toContain('query_result_value = 278671');
    expect(description).toContain('state = TRIGGERED');
    expect(description).toContain('예시 1');
    expect(description).toContain('입력: ({state}) {alert_name}');
    expect(description).toContain('결과: (TRIGGERED) 주문 수 이상 감지');
    expect(description).toContain('예시 2');
    expect(description).toContain(
      '입력: [{{ALERT_STATUS}}] {{QUERY_NAME}} - {{QUERY_RESULT_VALUE}}',
    );
    expect(description).toContain('결과: [TRIGGERED] 테스트3 - 278671');
  });
});
